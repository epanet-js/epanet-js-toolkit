# 💧@model-create/EPANET-engine

Internal engine for [epanet-js](https://github.com/modelcreate/epanet-js), C source code for Open Water Analytics EPANET v2.2 toolkit compiled to Javascript.

> **Note**: All version before 1.0.0 should be considered beta with potential breaking changes between releases, use in production with caution.

## Build

epanet-js is split into two packages, the epanet-engine package which compiles the original C code into WASM using Emscripten. And epanet-js is a TypeScript library which wraps over the generated module from Emscripten and manages memory allocation, error handling and returning of varaible.

**Building epanet-engine**

Run the command `pnpm run build` to creates a docker container of Emscripten and the compiled OWA-EPANET source code and generate types.

```sh
cd packages/epanet-engine
pnpm run build
```

## OPFS notes

- The Wasm build uses `WasmFS` and mounts the `OPFS` backend explicitly under `/opfs` only when the build has a supported execution strategy for OPFS.
- In practice that means either a `PTHREADS` build or a `JSPI`-enabled build. A plain single-threaded build falls back to memory.
- On the browser main thread the build intentionally falls back to the memory backend unless you opt into upstream `JSPI` support.
- Do not add `-sASYNCIFY=2` for this. Current Emscripten guidance is to use `JSPI` for the main-thread path, and that remains an experimental trade-off.
- `opfs-memory-test.html` and `opfs-memory-test.worker.js` can be used to confirm whether test files are visible in the browser's OPFS after a run.

### Pthreads variant

- Run `pnpm run build:pthreads` in `packages/epanet-engine` to emit `dist/index.pthreads.js` alongside the default single-threaded build.
- The pthreads variant is intended for browser testing and requires cross-origin isolation headers so that `SharedArrayBuffer` is available.
- From the repository root you can use `pnpm run serve:opfs-test` to serve the OPFS test page with the required `COOP` and `COEP` headers.

**Building epanet-js**

You must first build epanet-engine before you can test or build epanet-js.

```sh
cd packages/epanet-js
pnpm run test
pnpm run build
```

## License

The epanet-js and @model-create/epanet-engine are [MIT licenced](https://github.com/modelcreate/epanet-js/blob/master/LICENSE).

The hydraulic engine used within the epanet-js library is [OWA-EPANET](https://github.com/OpenWaterAnalytics/EPANET), which is [MIT licenced](https://github.com/OpenWaterAnalytics/EPANET/blob/dev/LICENSE), with contributed by the following [authors](https://github.com/OpenWaterAnalytics/EPANET/blob/dev/AUTHORS).
