## OPFS Support Implementation — Summary

### Files Changed (8 total)

**New files (2):**

- **wasmfs_opfs.c** — C helper with 3 exported functions: `epanet_supports_opfs()`, `epanet_can_mount_opfs()`, `epanet_mount_opfs()`
- **build_pthreads.sh** — Build script for pthreads+WasmFS+OPFS variant, outputs to `dist/pthreads/`

**Modified files (6):**

- **Dockerfile** — Added second cmake build with `-pthread` flag for pthreads-compatible static lib
- **build.sh** — Calls build_pthreads.sh after standard build
- **package.json** — Added `./pthreads` export and `build:emscripten-pthreads` script
- **Workspace.ts** — Added `WorkspaceOptions` interface, OPFS loading/mounting/fallback logic, `resolveFilePath()` helper
- **index.ts** — Added `WorkspaceOptions` type export
- **vite.config.ts** — Added pthreads engine path to rollup externals
- **create-types.js** — Added OPFS helper function types to generated `.d.ts`
- **index.d.ts** — Added OPFS helper types for immediate use

### How It Works

1. **Standard build** (existing, unchanged) — MEMFS, `SINGLE_FILE=1`, works everywhere
2. **Pthreads build** (new) — WasmFS + OPFS backend, requires SharedArrayBuffer (COOP/COEP headers)

Usage is opt-in and backward compatible:

```typescript
// Existing usage — unchanged
const ws = new Workspace();

// New OPFS usage
const ws = new Workspace({ useOPFS: true });
await ws.loadModule();

// ws.isOPFSEnabled tells you if OPFS actually mounted
// ws.resolveFilePath("output.bin") → "/opfs/output.bin" if OPFS active
```

Falls back gracefully at every level: if pthreads engine can't load → standard engine; if OPFS can't mount → in-memory WasmFS.

### Next Step

Run the Docker build to compile the WASM artifacts:

```
pnpm --filter @model-create/epanet-engine build
```

Made changes.
