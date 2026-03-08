// In-WASM paths: all I/O stays in WasmFS memory during the run
const MEMORY_INPUT_FILE = "/__opfs_memory_test.inp";
const REPORT_BASENAME = "__opfs_memory_test.rpt";
const OUTPUT_BASENAME = "__opfs_memory_test.bin";
const MEMORY_REPORT_FILE = `/${REPORT_BASENAME}`;
const MEMORY_OUTPUT_FILE = `/${OUTPUT_BASENAME}`;

// OPFS directory and file names for JS-side persistence
const OPFS_DIR_NAME = "epanet-opfs-test";

const LOCAL_IMPORTS = {
  local: "./packages/epanet-engine/dist/index.js",
  "local-pthreads": "./packages/epanet-engine/dist/index.pthreads.js",
};
const PUBLISHED_PACKAGE_URL =
  "https://esm.sh/epanet-js@0.8.0?bundle&target=es2022";

const runtimeCache = new Map();

function post(type, payload) {
  self.postMessage({ type, payload });
}

function getFileSizeBytes(fsApi, file) {
  try {
    return fsApi.stat(file).size;
  } catch {
    return 0;
  }
}

function hasOpfsSupportInWorker() {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.storage !== "undefined" &&
    typeof navigator.storage.getDirectory === "function"
  );
}

function hasPthreadsSupportInWorker() {
  return (
    typeof SharedArrayBuffer !== "undefined" &&
    self.crossOriginIsolated === true
  );
}

// ---------------------------------------------------------------------------
// JS-side OPFS helpers
// ---------------------------------------------------------------------------

async function getOpfsDirHandle() {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(OPFS_DIR_NAME, { create: true });
}

// Write a WasmFS file directly to OPFS using FileSystemSyncAccessHandle.
// The WASM heap is a SharedArrayBuffer (pthreads) or ArrayBuffer; we create a
// zero-copy view over it via engine.FS.stream operations so no full-file copy
// is ever held in JS — only a small chunk buffer at a time is allocated.
async function writeWasmFileToOpfs(engine, wasmPath, dirHandle, fileName) {
  const CHUNK = 1024 * 1024; // 1 MiB write chunks
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  const access = await fileHandle.createSyncAccessHandle();
  try {
    access.truncate(0);
    const stream = engine.FS.open(wasmPath, "r");
    try {
      const stat = engine.FS.stat(wasmPath);
      const totalSize = stat.size;
      let offset = 0;
      // Allocate one chunk buffer and reuse it for every write.
      const chunk = new Uint8Array(Math.min(CHUNK, totalSize || CHUNK));
      while (offset < totalSize) {
        const toRead = Math.min(CHUNK, totalSize - offset);
        // Resize view only when the last chunk is smaller.
        const view =
          toRead === chunk.length ? chunk : chunk.subarray(0, toRead);
        const nread = engine.FS.read(stream, view, 0, toRead, offset);
        if (nread <= 0) break;
        access.write(view.subarray(0, nread), { at: offset });
        offset += nread;
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

async function persistRunOutputToOpfs(engine, reportFile, outputFile) {
  if (!hasOpfsSupportInWorker()) {
    return { persisted: false, reason: "no-opfs-api" };
  }
  try {
    const dirHandle = await getOpfsDirHandle();
    const [reportBytes, outputBytes] = await Promise.all([
      writeWasmFileToOpfs(engine, reportFile, dirHandle, REPORT_BASENAME),
      writeWasmFileToOpfs(engine, outputFile, dirHandle, OUTPUT_BASENAME),
    ]);
    return {
      persisted: true,
      reason: null,
      reportBytes,
      outputBytes,
    };
  } catch (error) {
    return {
      persisted: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

async function getOpfsEntries(directoryHandle, prefix = "") {
  const entries = [];

  for await (const [name, handle] of directoryHandle.entries()) {
    const entryPath = prefix ? `${prefix}/${name}` : name;
    entries.push({
      path: entryPath,
      kind: handle.kind,
    });

    if (handle.kind === "directory") {
      entries.push(...(await getOpfsEntries(handle, entryPath)));
    }
  }

  entries.sort((left, right) => left.path.localeCompare(right.path));
  return entries;
}

async function getOpfsSnapshot() {
  if (!hasOpfsSupportInWorker()) {
    return {
      supported: false,
      entries: [],
    };
  }

  try {
    const rootDirectory = await navigator.storage.getDirectory();
    return {
      supported: true,
      entries: await getOpfsEntries(rootDirectory),
    };
  } catch (error) {
    return {
      supported: true,
      error: error instanceof Error ? error.message : String(error),
      entries: [],
    };
  }
}

function hasObservedTestDirEntries(opfsEntries) {
  return opfsEntries.some(
    (entry) =>
      entry.path.startsWith(OPFS_DIR_NAME + "/") && entry.kind === "file",
  );
}

async function loadEngineFactory(importPath) {
  const module = await import(importPath);
  return module.default;
}

function removeIfExists(engine, file) {
  try {
    engine.FS.unlink(file);
  } catch {
    return;
  }
}

function getErrorMessage(engine, code) {
  const pointer = engine._malloc(256);

  try {
    engine._EN_geterror(code, pointer, 256);
    return engine.UTF8ToString(pointer);
  } finally {
    engine._free(pointer);
  }
}

function throwIfError(engine, code, context) {
  if (code < 100) {
    return;
  }

  throw new Error(
    `${context} failed with code ${code}: ${getErrorMessage(engine, code)}`,
  );
}

function assertLocalThreadingSupport(source) {
  if (source !== "local-pthreads") {
    return;
  }
  if (!hasPthreadsSupportInWorker()) {
    throw new Error(
      "The pthreads build requires cross-origin isolation (COOP/COEP) and SharedArrayBuffer support.",
    );
  }
}

async function getLocalRuntime(source) {
  const importPath = LOCAL_IMPORTS[source] ?? LOCAL_IMPORTS.local;
  const cacheKey = `local:${source}`;

  if (!runtimeCache.has(cacheKey)) {
    runtimeCache.set(
      cacheKey,
      (async () => {
        assertLocalThreadingSupport(source);
        const createEngine = await loadEngineFactory(importPath);
        const engine = await createEngine();

        return {
          kind: source,
          importPath,
          async run(inputBytes, iterations) {
            // All EPANET I/O runs in WASM memory for speed, then we persist
            // the outputs to OPFS from JS after the final iteration.
            const inputFile = MEMORY_INPUT_FILE;
            const reportFile = MEMORY_REPORT_FILE;
            const outputFile = MEMORY_OUTPUT_FILE;

            engine.FS.writeFile(inputFile, new Uint8Array(inputBytes));
            removeIfExists(engine, reportFile);
            removeIfExists(engine, outputFile);

            const perIteration = [];
            const totalStart = performance.now();

            for (let iteration = 1; iteration <= iterations; iteration += 1) {
              const iterationStart = performance.now();
              let projectHandle = 0;
              let handlePointer = 0;

              const inputPointer = engine.stringToNewUTF8(inputFile);
              const reportPointer = engine.stringToNewUTF8(reportFile);
              const outputPointer = engine.stringToNewUTF8(outputFile);

              try {
                removeIfExists(engine, reportFile);
                removeIfExists(engine, outputFile);

                handlePointer = engine._malloc(4);
                throwIfError(
                  engine,
                  engine._EN_createproject(handlePointer),
                  "EN_createproject",
                );
                projectHandle = engine.getValue(handlePointer, "i32");

                throwIfError(
                  engine,
                  engine._EN_runproject(
                    projectHandle,
                    inputPointer,
                    reportPointer,
                    outputPointer,
                    0,
                  ),
                  "EN_runproject",
                );
              } finally {
                if (projectHandle !== 0) {
                  engine._EN_deleteproject(projectHandle);
                }
                if (handlePointer !== 0) {
                  engine._free(handlePointer);
                }
                engine._free(inputPointer);
                engine._free(reportPointer);
                engine._free(outputPointer);
              }

              const iterationDurationMs = performance.now() - iterationStart;
              const reportBytes = getFileSizeBytes(engine.FS, reportFile);
              const outputBytes = getFileSizeBytes(engine.FS, outputFile);
              const summary = {
                iteration,
                iterationDurationMs,
                reportBytes,
                outputBytes,
              };
              perIteration.push(summary);
              post("progress", summary);
            }

            const totalDurationMs = performance.now() - totalStart;
            const reportBytes = getFileSizeBytes(engine.FS, reportFile);
            const outputBytes = getFileSizeBytes(engine.FS, outputFile);

            // Persist final iteration outputs to OPFS from JS
            const persistence = await persistRunOutputToOpfs(
              engine,
              reportFile,
              outputFile,
            );
            const opfsSnapshot = await getOpfsSnapshot();
            const hasFiles = hasObservedTestDirEntries(opfsSnapshot.entries);

            return {
              totalDurationMs,
              averageDurationMs: totalDurationMs / iterations,
              reportBytes,
              outputBytes,
              storage: {
                mode: !opfsSnapshot.supported
                  ? "memory-fallback"
                  : persistence.persisted
                    ? "opfs-visible"
                    : "opfs-not-observed",
                persistReason: persistence.reason,
                opfsDir: OPFS_DIR_NAME,
                opfsEntries: opfsSnapshot.entries,
                opfsError: opfsSnapshot.error ?? null,
              },
              perIteration,
            };
          },
        };
      })(),
    );
  }

  return runtimeCache.get(cacheKey);
}

async function getPublishedRuntime() {
  if (!runtimeCache.has("published-0.8.0")) {
    runtimeCache.set(
      "published-0.8.0",
      (async () => {
        const publishedModule = await import(PUBLISHED_PACKAGE_URL);
        const Workspace = publishedModule.Workspace;
        const Project = publishedModule.Project;

        const workspace = new Workspace();
        await workspace.loadModule();
        const project = new Project(workspace);

        return {
          kind: "published-0.8.0",
          importPath: PUBLISHED_PACKAGE_URL,
          async run(inputBytes, iterations) {
            const inputFile = MEMORY_INPUT_FILE;
            const reportFile = `/${REPORT_BASENAME}`;
            const outputFile = `/${OUTPUT_BASENAME}`;

            workspace.writeFile(inputFile, new Uint8Array(inputBytes));

            const perIteration = [];
            const totalStart = performance.now();

            for (let iteration = 1; iteration <= iterations; iteration += 1) {
              const iterationStart = performance.now();

              try {
                workspace.instance.FS.unlink(reportFile);
              } catch {}
              try {
                workspace.instance.FS.unlink(outputFile);
              } catch {}

              project.runProject(inputFile, reportFile, outputFile);

              const iterationDurationMs = performance.now() - iterationStart;
              const reportBytes = getFileSizeBytes(
                workspace.instance.FS,
                reportFile,
              );
              const outputBytes = getFileSizeBytes(
                workspace.instance.FS,
                outputFile,
              );

              const summary = {
                iteration,
                iterationDurationMs,
                reportBytes,
                outputBytes,
              };
              perIteration.push(summary);
              post("progress", summary);
            }

            const totalDurationMs = performance.now() - totalStart;
            const reportBytes = getFileSizeBytes(
              workspace.instance.FS,
              reportFile,
            );
            const outputBytes = getFileSizeBytes(
              workspace.instance.FS,
              outputFile,
            );

            return {
              totalDurationMs,
              averageDurationMs: totalDurationMs / iterations,
              reportBytes,
              outputBytes,
              storage: {
                mode: "package-managed",
                opfsEntries: [],
                opfsError: null,
              },
              perIteration,
            };
          },
        };
      })(),
    );
  }

  return runtimeCache.get("published-0.8.0");
}

async function getRuntime(source) {
  if (source === "published-0.8.0") {
    return getPublishedRuntime();
  }

  return getLocalRuntime(source);
}

async function runSimulation({ fileName, inputBytes, iterations, source }) {
  const safeIterations =
    Number.isFinite(iterations) && iterations > 0 ? Math.floor(iterations) : 1;
  const runtime = await getRuntime(source);

  const result = await runtime.run(inputBytes, safeIterations);

  return {
    fileName,
    source: runtime.kind,
    importPath: runtime.importPath,
    iterations: safeIterations,
    ...result,
  };
}

self.onmessage = async (event) => {
  const { type, payload } = event.data ?? {};

  if (type !== "run-simulation") {
    return;
  }

  try {
    post("status", `Initializing worker run for ${payload.source}...`);
    const result = await runSimulation(payload);
    post("result", result);
  } catch (error) {
    post("error", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? (error.stack ?? "") : "",
    });
  }
};

post("ready", {
  supportsWorker: true,
  supportsOpfsInWorker: hasOpfsSupportInWorker(),
  supportsPthreadsInWorker: hasPthreadsSupportInWorker(),
  crossOriginIsolated: self.crossOriginIsolated === true,
  opfsDirName: OPFS_DIR_NAME,
  sources: {
    ...LOCAL_IMPORTS,
    "published-0.8.0": PUBLISHED_PACKAGE_URL,
  },
});
