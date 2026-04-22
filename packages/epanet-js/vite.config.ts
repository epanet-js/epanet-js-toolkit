import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { resolve } from "path";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from "fs";

const ENGINE_VERSIONS = [
  "v2.2", "v2.2-msx",
  "v2.3", "v2.3-msx",
  "v2.3.1", "v2.3.1-msx",
  "v2.3.2", "v2.3.2-msx",
  "v2.3.3", "v2.3.3-msx",
  "v2.3.4", "v2.3.4-msx",
  "v2.3.5", "v2.3.5-msx",
  "master", "master-msx",
  "dev", "dev-msx",
];

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        "slim/index": resolve(__dirname, "src/slim/index.ts"),
      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) =>
        `${entryName}.${format === "es" ? "mjs" : "cjs"}`,
    },
    rollupOptions: {},
  },
  plugins: [
    dts(),
    {
      name: "copy-wasm",
      writeBundle(options) {
        const outDir = options.dir!;
        for (const version of ENGINE_VERSIONS) {
          const src = resolve(
            __dirname,
            `node_modules/@epanet-js/epanet-engine/dist/${version}/EpanetEngine.wasm`
          );
          const destDir = resolve(outDir, `engines/${version}`);
          mkdirSync(destDir, { recursive: true });
          copyFileSync(src, resolve(destDir, "EpanetEngine.wasm"));
        }
      },
      closeBundle() {
        // Copy pre-built engine JS files from epanet-js-engine and generate thin
        // named-export wrappers. This avoids vite inlining WASM as base64, which
        // it does when it sees `new URL("EpanetEngine.wasm", import.meta.url)` in
        // the emscripten output during a lib-mode build.
        for (const version of ENGINE_VERSIONS) {
          const engineSrcDir = resolve(
            __dirname,
            `node_modules/@epanet-js/epanet-engine/dist/${version}`
          );
          const destDir = resolve(__dirname, `dist/engines/${version}`);
          mkdirSync(destDir, { recursive: true });

          // Copy the pre-built engine code as private files (_engine.*).
          // The engine uses import.meta.url / __dirname to locate EpanetEngine.wasm
          // relative to itself, so it must live in the same directory as the WASM.
          copyFileSync(resolve(engineSrcDir, "index.mjs"), resolve(destDir, "_engine.mjs"));
          copyFileSync(resolve(engineSrcDir, "index.cjs"), resolve(destDir, "_engine.cjs"));

          // ESM wrapper: declare the WASM URL at module top level so that both
          // Vite and webpack can statically detect the asset and copy it to
          // their output directory.  The URL is forwarded via locateFile so the
          // engine never has to re-derive it from import.meta.url inside the
          // bundled (and potentially rebased) _engine.mjs.
          writeFileSync(
            resolve(destDir, "index.mjs"),
            [
              "import _EpanetEngine from './_engine.mjs';",
              "const _wasmUrl = new URL('./EpanetEngine.wasm', import.meta.url);",
              "export function EpanetEngine(opts) {",
              "  const { locateFile: _locateFile, ...rest } = opts || {};",
              "  return _EpanetEngine({",
              "    locateFile: _locateFile || (path => path === 'EpanetEngine.wasm' ? _wasmUrl.toString() : path),",
              "    ...rest",
              "  });",
              "}",
              "export default EpanetEngine;",
              "",
            ].join("\n")
          );

          // CJS wrapper: use __dirname + path.join for Node.js / SSR environments.
          writeFileSync(
            resolve(destDir, "index.cjs"),
            [
              "'use strict';",
              "const _path = require('path');",
              "const e = require('./_engine.cjs');",
              "const _EpanetEngine = e.default !== undefined ? e.default : e;",
              "const _wasmPath = _path.join(__dirname, 'EpanetEngine.wasm');",
              "function EpanetEngine(opts) {",
              "  const { locateFile: _locateFile, ...rest } = opts || {};",
              "  return _EpanetEngine({",
              "    locateFile: _locateFile || (p => p === 'EpanetEngine.wasm' ? _wasmPath : p),",
              "    ...rest",
              "  });",
              "}",
              "module.exports = { EpanetEngine };",
              "module.exports.default = EpanetEngine;",
              "",
            ].join("\n")
          );
        }

        // vite-plugin-dts generates dist/src/engines/[version]/index.d.ts as a
        // shallow re-export from @epanet-js/epanet-engine. Replace each one with
        // a self-contained declaration by copying the engine's types locally.
        for (const version of ENGINE_VERSIONS) {
          const engineSrcDir = resolve(
            __dirname,
            `node_modules/@epanet-js/epanet-engine/dist/${version}`
          );
          const declDestDir = resolve(__dirname, `dist/src/engines/${version}`);

          mkdirSync(declDestDir, { recursive: true });

          // Copy the engine's full declaration file alongside as engine-index.d.ts
          copyFileSync(
            resolve(engineSrcDir, "index.d.ts"),
            resolve(declDestDir, "engine-index.d.ts")
          );

          // Copy the enums directory so relative imports in engine-index.d.ts resolve
          cpSync(
            resolve(engineSrcDir, "enums"),
            resolve(declDestDir, "enums"),
            { recursive: true }
          );

          // Overwrite the shallow re-export with a self-contained declaration
          writeFileSync(
            resolve(declDestDir, "index.d.ts"),
            `export { default as EpanetEngine } from './engine-index';\n`
          );
        }

        // Roll up @epanet-js/epanet-engine references so the published
        // declarations have no dependency on the workspace-internal package.

        // 1. types.d.ts — remove EpanetEngine import, widen keyof EpanetEngine → string
        const typesDecl = resolve(__dirname, "dist/src/types.d.ts");
        if (existsSync(typesDecl)) {
          let content = readFileSync(typesDecl, "utf8");
          content = content
            .replace(/^import\s+\{[^}]*\bEpanetEngine\b[^}]*\}\s+from\s+'@epanet-js\/epanet-engine'\s*;\n/gm, "")
            .replace(/\bkeyof\s+EpanetEngine\b/g, "string");
          writeFileSync(typesDecl, content);
        }

        // 2. Project.d.ts — redirect the root engine import to the local LTS copy
        const projectDecl = resolve(__dirname, "dist/src/Project/Project.d.ts");
        if (existsSync(projectDecl)) {
          let content = readFileSync(projectDecl, "utf8");
          content = content.replace(
            /from '@epanet-js\/epanet-engine'/g,
            "from '../engines/v2.3.5/engine-index'"
          );
          writeFileSync(projectDecl, content);
        }

        // 3. SlimWorkspace.d.ts — redirect all version-specific engine imports to local copies
        const slimDecl = resolve(__dirname, "dist/src/Workspace/SlimWorkspace.d.ts");
        if (existsSync(slimDecl)) {
          let content = readFileSync(slimDecl, "utf8");
          content = content.replace(
            /from '@epanet-js\/epanet-engine\/([^']+)'/g,
            "from '../engines/$1/engine-index'"
          );
          writeFileSync(slimDecl, content);
        }
      },
    },
  ],
});
