/**
 * opfs-memory-test.worker.js
 *
 * Web Worker that runs EPANET simulations using one of three engine sources:
 *
 *   1. "standard"  — local MEMFS build (dist/index.js, no OPFS)
 *   2. "pthreads"  — local pthreads build (dist/pthreads/epanet.js, WasmFS + OPFS)
 *   3. "published"  — published epanet-js@0.8.0 from esm.sh (baseline)
 *
 * The standard & pthreads modes use the raw epanet-engine C API directly.
 * The published mode uses the high-level Workspace/Project classes from 0.8.0.
 *
 * For the standard build, the worker additionally persists output files to OPFS
 * from JavaScript (post-run) so you can inspect them in DevTools → Application
 * → Storage → OPFS.
 *
 * For the pthreads build, WasmFS handles OPFS persistence at the C level — the
 * engine itself writes directly to OPFS-backed files when mounted.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Virtual filesystem paths used inside WASM
const WASM_INPUT = "/test_model.inp";
const WASM_REPORT = "/test_model.rpt";
const WASM_OUTPUT = "/test_model.bin";

// For pthreads build — files routed through OPFS mount
const OPFS_MOUNT = "/opfs";
const OPFS_REPORT = `${OPFS_MOUNT}/test_model.rpt`;
const OPFS_OUTPUT = `${OPFS_MOUNT}/test_model.bin`;

// OPFS directory used for JS-side persistence (standard build only)
const OPFS_JS_DIR = "epanet-opfs-test";

// Import paths (relative to repo root, resolved by the dev server)
const ENGINE_STANDARD = "../../packages/epanet-engine/dist/index.js";
const ENGINE_PTHREADS = "../../packages/epanet-engine/dist/pthreads/epanet.js";
const PUBLISHED_URL = "https://esm.sh/epanet-js@0.8.0?bundle&target=es2022";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Post a typed message to the main thread */
function post(type, payload) {
  self.postMessage({ type, payload });
}

/** Safe file size read from an Emscripten FS */
function fileSize(fs, path) {
  try {
    return fs.stat(path).size;
  } catch {
    return 0;
  }
}

/** Format bytes for logging */
function fmtBytes(n) {
  if (n <= 0) return "0 B";
  const u = ["B", "KB", "MB", "GB"];
  let v = n,
    i = 0;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 2)} ${u[i]}`;
}

/** Get error text from an EPANET error code */
function getEpanetError(engine, code) {
  const ptr = engine._malloc(256);
  try {
    engine._EN_geterror(code, ptr, 256);
    return engine.UTF8ToString(ptr);
  } finally {
    engine._free(ptr);
  }
}

/** Throw if EPANET returned an error code >= 100 */
function check(engine, code, label) {
  if (code >= 100) {
    throw new Error(`${label} → code ${code}: ${getEpanetError(engine, code)}`);
  }
}

/** Try to unlink a virtual file (ignore if missing) */
function tryUnlink(fs, path) {
  try {
    fs.unlink(path);
  } catch {
    /* ok */
  }
}

function hasOpfsApi() {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.storage?.getDirectory === "function"
  );
}

function hasSharedArrayBuffer() {
  return (
    typeof SharedArrayBuffer !== "undefined" &&
    self.crossOriginIsolated === true
  );
}

// ---------------------------------------------------------------------------
// JS-side OPFS persistence (used by the standard build only)
// ---------------------------------------------------------------------------

/**
 * Write a file from WasmFS to browser OPFS in 1 MiB chunks.
 * Uses FileSystemSyncAccessHandle for zero-copy streaming.
 */
async function writeWasmFileToOpfs(engine, wasmPath, dirHandle, opfsName) {
  const CHUNK = 1024 * 1024;
  const handle = await dirHandle.getFileHandle(opfsName, { create: true });
  const access = await handle.createSyncAccessHandle();
  try {
    access.truncate(0);
    const total = fileSize(engine.FS, wasmPath);
    if (total === 0) return 0;

    const stream = engine.FS.open(wasmPath, "r");
    try {
      const buf = new Uint8Array(Math.min(CHUNK, total));
      let offset = 0;
      while (offset < total) {
        const toRead = Math.min(CHUNK, total - offset);
        const view = toRead === buf.length ? buf : buf.subarray(0, toRead);
        const n = engine.FS.read(stream, view, 0, toRead, offset);
        if (n <= 0) break;
        access.write(view.subarray(0, n), { at: offset });
        offset += n;
      }
      access.flush();
      return offset;
    } finally {
      engine.FS.close(stream);
    }
  } finally {
    access.close();
  }
}

/** Persist report + output to OPFS from JS after a standard-build run */
async function jsPersistToOpfs(engine, reportFile, outputFile) {
  if (!hasOpfsApi()) return { persisted: false, reason: "no-opfs-api" };
  try {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle(OPFS_JS_DIR, { create: true });
    const [rBytes, oBytes] = await Promise.all([
      writeWasmFileToOpfs(engine, reportFile, dir, "test_model.rpt"),
      writeWasmFileToOpfs(engine, outputFile, dir, "test_model.bin"),
    ]);
    return { persisted: true, reportBytes: rBytes, outputBytes: oBytes };
  } catch (e) {
    return {
      persisted: false,
      reason: e instanceof Error ? e.message : String(e),
    };
  }
}

/** List all OPFS entries recursively (for debugging display) */
async function listOpfs(handle, prefix = "") {
  const entries = [];
  for await (const [name, h] of handle.entries()) {
    const p = prefix ? `${prefix}/${name}` : name;
    entries.push({ path: p, kind: h.kind });
    if (h.kind === "directory") {
      entries.push(...(await listOpfs(h, p)));
    }
  }
  return entries.sort((a, b) => a.path.localeCompare(b.path));
}

async function getOpfsSnapshot() {
  if (!hasOpfsApi()) return { supported: false, entries: [] };
  try {
    const root = await navigator.storage.getDirectory();
    return { supported: true, entries: await listOpfs(root) };
  } catch (e) {
    return { supported: true, error: String(e), entries: [] };
  }
}

// ---------------------------------------------------------------------------
// Engine runtime cache — each source is loaded once
// ---------------------------------------------------------------------------
const cache = new Map();

// ---------------------------------------------------------------------------
// Standard build (MEMFS, with JS OPFS persistence)
// ---------------------------------------------------------------------------
async function getStandardRuntime() {
  const key = "standard";
  if (!cache.has(key)) {
    cache.set(
      key,
      (async () => {
        post("status", "Loading standard (MEMFS) engine…");
        const mod = await import(ENGINE_STANDARD);
        const factory = mod.default || mod;
        const engine = await factory();
        post("status", "Standard engine ready.");

        return {
          kind: key,
          importPath: ENGINE_STANDARD,
          opfsMode: "js-persistence",
          async run(inputBytes, iterations) {
            engine.FS.writeFile(WASM_INPUT, new Uint8Array(inputBytes));
            const runs = [];
            const t0 = performance.now();

            for (let i = 1; i <= iterations; i++) {
              tryUnlink(engine.FS, WASM_REPORT);
              tryUnlink(engine.FS, WASM_OUTPUT);

              const ti = performance.now();
              let ph = 0,
                phPtr = 0;
              const pInput = engine.stringToNewUTF8(WASM_INPUT);
              const pReport = engine.stringToNewUTF8(WASM_REPORT);
              const pOutput = engine.stringToNewUTF8(WASM_OUTPUT);
              try {
                phPtr = engine._malloc(4);
                check(
                  engine,
                  engine._EN_createproject(phPtr),
                  "EN_createproject",
                );
                ph = engine.getValue(phPtr, "i32");
                check(
                  engine,
                  engine._EN_runproject(ph, pInput, pReport, pOutput, 0),
                  "EN_runproject",
                );
              } finally {
                if (ph) engine._EN_deleteproject(ph);
                if (phPtr) engine._free(phPtr);
                engine._free(pInput);
                engine._free(pReport);
                engine._free(pOutput);
              }

              const dur = performance.now() - ti;
              const rBytes = fileSize(engine.FS, WASM_REPORT);
              const oBytes = fileSize(engine.FS, WASM_OUTPUT);
              runs.push({
                iteration: i,
                iterationDurationMs: dur,
                reportBytes: rBytes,
                outputBytes: oBytes,
              });
              post("progress", runs[runs.length - 1]);
            }

            const total = performance.now() - t0;
            const reportBytes = fileSize(engine.FS, WASM_REPORT);
            const outputBytes = fileSize(engine.FS, WASM_OUTPUT);

            // JS-side OPFS persistence
            const persist = await jsPersistToOpfs(
              engine,
              WASM_REPORT,
              WASM_OUTPUT,
            );
            const snap = await getOpfsSnapshot();

            return {
              totalDurationMs: total,
              averageDurationMs: total / iterations,
              reportBytes,
              outputBytes,
              perIteration: runs,
              storage: {
                mode: persist.persisted ? "js-opfs" : "memory-only",
                persistReason: persist.reason ?? null,
                opfsDir: OPFS_JS_DIR,
                opfsEntries: snap.entries,
                opfsError: snap.error ?? null,
              },
            };
          },
        };
      })(),
    );
  }
  return cache.get(key);
}

// ---------------------------------------------------------------------------
// Pthreads build (WasmFS + OPFS at C level)
// ---------------------------------------------------------------------------
async function getPthreadsRuntime() {
  const key = "pthreads";
  if (!cache.has(key)) {
    cache.set(
      key,
      (async () => {
        if (!hasSharedArrayBuffer()) {
          throw new Error(
            "Pthreads build requires SharedArrayBuffer + cross-origin isolation " +
              "(COOP/COEP headers). Use the serve script: pnpm run serve:opfs-test",
          );
        }

        post("status", "Loading pthreads (WasmFS + OPFS) engine…");
        const mod = await import(ENGINE_PTHREADS);
        const factory = mod.default || mod;
        const engine = await factory();
        post("status", "Pthreads engine loaded.");

        // Try to mount OPFS at the C level
        let opfsMounted = false;
        const supportsOpfs = engine._epanet_supports_opfs;
        const canMountOpfs = engine._epanet_can_mount_opfs;
        const mountOpfs = engine._epanet_mount_opfs;

        if (
          typeof supportsOpfs === "function" &&
          typeof canMountOpfs === "function" &&
          typeof mountOpfs === "function"
        ) {
          if (supportsOpfs() && canMountOpfs()) {
            const pathLen = engine.lengthBytesUTF8(OPFS_MOUNT) + 1;
            const pathPtr = engine._malloc(pathLen);
            engine.stringToUTF8(OPFS_MOUNT, pathPtr, pathLen);
            try {
              const rc = mountOpfs(pathPtr);
              opfsMounted = rc === 0;
              if (rc !== 0)
                post("status", `⚠ epanet_mount_opfs returned ${rc}`);
            } finally {
              engine._free(pathPtr);
            }
          } else {
            post("status", "⚠ OPFS API not available in this browser/context");
          }
        } else {
          post(
            "status",
            "⚠ OPFS helper functions not found on engine — old build?",
          );
        }

        post(
          "status",
          `OPFS mounted: ${opfsMounted ? "yes ✓" : "no — files stay in WasmFS memory"}`,
        );

        // Choose file paths based on whether OPFS mounted
        const reportFile = opfsMounted ? OPFS_REPORT : WASM_REPORT;
        const outputFile = opfsMounted ? OPFS_OUTPUT : WASM_OUTPUT;

        return {
          kind: key,
          importPath: ENGINE_PTHREADS,
          opfsMode: opfsMounted ? "wasmfs-opfs" : "wasmfs-memory",
          opfsMounted,
          async run(inputBytes, iterations) {
            // Input stays in MEMFS root (fast access)
            engine.FS.writeFile(WASM_INPUT, new Uint8Array(inputBytes));
            const runs = [];
            const t0 = performance.now();

            for (let i = 1; i <= iterations; i++) {
              tryUnlink(engine.FS, reportFile);
              tryUnlink(engine.FS, outputFile);

              const ti = performance.now();
              let ph = 0,
                phPtr = 0;
              const pInput = engine.stringToNewUTF8(WASM_INPUT);
              const pReport = engine.stringToNewUTF8(reportFile);
              const pOutput = engine.stringToNewUTF8(outputFile);
              try {
                phPtr = engine._malloc(4);
                check(
                  engine,
                  engine._EN_createproject(phPtr),
                  "EN_createproject",
                );
                ph = engine.getValue(phPtr, "i32");
                check(
                  engine,
                  engine._EN_runproject(ph, pInput, pReport, pOutput, 0),
                  "EN_runproject",
                );
              } finally {
                if (ph) engine._EN_deleteproject(ph);
                if (phPtr) engine._free(phPtr);
                engine._free(pInput);
                engine._free(pReport);
                engine._free(pOutput);
              }

              const dur = performance.now() - ti;
              const rBytes = fileSize(engine.FS, reportFile);
              const oBytes = fileSize(engine.FS, outputFile);
              runs.push({
                iteration: i,
                iterationDurationMs: dur,
                reportBytes: rBytes,
                outputBytes: oBytes,
              });
              post("progress", runs[runs.length - 1]);
            }

            const total = performance.now() - t0;
            const reportBytes = fileSize(engine.FS, reportFile);
            const outputBytes = fileSize(engine.FS, outputFile);

            // No JS persistence needed — if OPFS is mounted, WasmFS already
            // wrote to OPFS transparently at the C level.
            const snap = await getOpfsSnapshot();

            return {
              totalDurationMs: total,
              averageDurationMs: total / iterations,
              reportBytes,
              outputBytes,
              perIteration: runs,
              storage: {
                mode: opfsMounted ? "wasmfs-opfs" : "wasmfs-memory",
                opfsMounted,
                opfsEntries: snap.entries,
                opfsError: snap.error ?? null,
              },
            };
          },
        };
      })(),
    );
  }
  return cache.get(key);
}

// ---------------------------------------------------------------------------
// Published epanet-js@0.8.0 (baseline comparison)
// ---------------------------------------------------------------------------
async function getPublishedRuntime() {
  const key = "published";
  if (!cache.has(key)) {
    cache.set(
      key,
      (async () => {
        post("status", "Loading epanet-js@0.8.0 from esm.sh…");
        const pub = await import(PUBLISHED_URL);
        const Workspace = pub.Workspace;
        const Project = pub.Project;

        const ws = new Workspace();
        await ws.loadModule();
        const proj = new Project(ws);
        post("status", "Published 0.8.0 ready.");

        return {
          kind: key,
          importPath: PUBLISHED_URL,
          opfsMode: "none",
          async run(inputBytes, iterations) {
            ws.writeFile(WASM_INPUT, new Uint8Array(inputBytes));
            const runs = [];
            const t0 = performance.now();

            for (let i = 1; i <= iterations; i++) {
              try {
                ws.instance.FS.unlink(WASM_REPORT);
              } catch {}
              try {
                ws.instance.FS.unlink(WASM_OUTPUT);
              } catch {}

              const ti = performance.now();
              proj.runProject(WASM_INPUT, WASM_REPORT, WASM_OUTPUT);
              const dur = performance.now() - ti;

              const rBytes = fileSize(ws.instance.FS, WASM_REPORT);
              const oBytes = fileSize(ws.instance.FS, WASM_OUTPUT);
              runs.push({
                iteration: i,
                iterationDurationMs: dur,
                reportBytes: rBytes,
                outputBytes: oBytes,
              });
              post("progress", runs[runs.length - 1]);
            }

            const total = performance.now() - t0;
            return {
              totalDurationMs: total,
              averageDurationMs: total / iterations,
              reportBytes: fileSize(ws.instance.FS, WASM_REPORT),
              outputBytes: fileSize(ws.instance.FS, WASM_OUTPUT),
              perIteration: runs,
              storage: {
                mode: "in-memory-0.8.0",
                opfsEntries: [],
                opfsError: null,
              },
            };
          },
        };
      })(),
    );
  }
  return cache.get(key);
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------
async function getRuntime(source) {
  switch (source) {
    case "standard":
      return getStandardRuntime();
    case "pthreads":
      return getPthreadsRuntime();
    case "published":
      return getPublishedRuntime();
    default:
      throw new Error(`Unknown source: ${source}`);
  }
}

async function runSimulation({ fileName, inputBytes, iterations, source }) {
  const n =
    Number.isFinite(iterations) && iterations > 0 ? Math.floor(iterations) : 1;
  const rt = await getRuntime(source);
  const result = await rt.run(inputBytes, n);
  return {
    fileName,
    source: rt.kind,
    importPath: rt.importPath,
    opfsMode: rt.opfsMode,
    iterations: n,
    ...result,
  };
}

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------
self.onmessage = async (event) => {
  const { type, payload } = event.data ?? {};
  if (type !== "run-simulation") return;

  try {
    post("status", `Starting ${payload.source} run for ${payload.fileName}…`);
    const result = await runSimulation(payload);
    post("result", result);
  } catch (err) {
    post("error", {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? (err.stack ?? "") : "",
    });
  }
};

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
post("ready", {
  crossOriginIsolated: self.crossOriginIsolated === true,
  hasSharedArrayBuffer: typeof SharedArrayBuffer !== "undefined",
  hasOpfsApi: hasOpfsApi(),
  sources: {
    standard: ENGINE_STANDARD,
    pthreads: ENGINE_PTHREADS,
    published: PUBLISHED_URL,
  },
});
