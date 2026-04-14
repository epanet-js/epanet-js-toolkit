# @epanet-js/epanet-engine

WebAssembly bindings for [EPANET](https://github.com/OpenWaterAnalytics/EPANET), the water distribution network simulator. Includes optional support for [EPANET-MSX](https://github.com/USEPA/EPANETMSX), the Multi-Species Extension for advanced water quality modelling.

## Installation

```sh
npm install @epanet-js/epanet-engine
```

## Usage

### EPANET only

Each versioned sub-path exports a factory function and a companion `.wasm` binary. Pass the binary to the factory so the engine can be loaded without a network fetch.

```js
import { loader } from '@epanet-js/epanet-engine'
import { readFileSync } from 'fs'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

const { default: factory } = await import('epanet-engine/v2.3.5')
const wasmBinary = readFileSync(require.resolve('epanet-engine/v2.3.5').replace('.js', '.wasm'))
const f = await loader(() => factory({ wasmBinary }))

// Write input file to the virtual FS
f.FS.writeFile('net.inp', readFileSync('./network.inp'))

// Create a project handle
const phPtr = f.malloc(4)
f.EN_createproject(phPtr)
const ph = f.getValue(phPtr, 'i32')
f.free(phPtr)

// Open the network
const inpPtr = f.allocateUTF8('net.inp')
const rptPtr = f.allocateUTF8('net.rpt')
const outPtr = f.allocateUTF8('net.out')
f.EN_open(ph, inpPtr, rptPtr, outPtr)
f.free(inpPtr); f.free(rptPtr); f.free(outPtr)

// Run simulation
f.EN_solveH(ph)
f.EN_solveQ(ph)
f.EN_report(ph)

// Read results from the virtual FS
const report = f.FS.readFile('net.rpt', { encoding: 'utf8' })

f.EN_deleteproject(ph)
```

### EPANET + MSX

The `-msx` variants expose both `EN_*` and `MSX*` functions.

```js
import { loader } from '@epanet-js/epanet-engine'
import { readFileSync } from 'fs'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

const { default: factory } = await import('epanet-engine/v2.3.5-msx')
const wasmBinary = readFileSync(require.resolve('epanet-engine/v2.3.5-msx').replace('.js', '.wasm'))
const f = await loader(() => factory({ wasmBinary }))

f.FS.writeFile('net.inp', readFileSync('./network.inp'))
f.FS.writeFile('net.msx', readFileSync('./network.msx'))

const phPtr = f.malloc(4)
f.EN_createproject(phPtr)
const ph = f.getValue(phPtr, 'i32')
f.free(phPtr)

const inpPtr = f.allocateUTF8('net.inp')
const rptPtr = f.allocateUTF8('net.rpt')
const outPtr = f.allocateUTF8('net.out')
f.EN_open(ph, inpPtr, rptPtr, outPtr)
f.free(inpPtr); f.free(rptPtr); f.free(outPtr)

// Open MSX
const msxPtr = f.allocateUTF8('net.msx')
f.MSXopen(ph, msxPtr)
f.free(msxPtr)

// Solve hydraulics and water quality
f.MSXsolveH()
f.MSXsolveQ()
f.MSXreport()

const msxReport = f.FS.readFile('msxreport.txt', { encoding: 'utf8' })

f.MSXclose()
f.EN_close(ph)
f.EN_deleteproject(ph)
```

**Using pre-computed hydraulics from EPANET:**

```js
// Solve with EPANET and save hydraulics
f.EN_solveH(ph)
const hydPtr = f.allocateUTF8('results.hyd')
f.EN_savehydfile(ph, hydPtr)

// Pass the hydraulics file to MSX
f.MSXopen(ph, msxPtr)
f.MSXusehydfile(hydPtr)
f.free(hydPtr)

f.MSXsolveQ()
f.MSXreport()
```

### LTS single-file build

The LTS build (v2.3.5 + MSX) has the WASM binary embedded in the JS file — no separate `.wasm` needed. Useful for environments where loading a second binary is inconvenient.

```js
import { loader } from '@epanet-js/epanet-engine'
import { loader } from '@epanet-js/epanet-engine'

// Direct import — no wasmBinary argument
const { default: factory } = await import(
  new URL('./node_modules/epanet-engine/dist/lts/EpanetEngine.js', import.meta.url)
)
const f = await loader(() => factory())

// Use f exactly like the MSX examples above
```

## Available builds

| Version  | EPANET only              | EPANET + MSX                 |
|----------|--------------------------|------------------------------|
| v2.2     | `@epanet-js/epanet-engine/v2.2`     | `@epanet-js/epanet-engine/v2.2-msx`          |
| v2.3     | `@epanet-js/epanet-engine/v2.3`     | `@epanet-js/epanet-engine/v2.3-msx`          |
| v2.3.1   | `@epanet-js/epanet-engine/v2.3.1`   | `@epanet-js/epanet-engine/v2.3.1-msx`        |
| v2.3.2   | `@epanet-js/epanet-engine/v2.3.2`   | `@epanet-js/epanet-engine/v2.3.2-msx`        |
| v2.3.3   | `@epanet-js/epanet-engine/v2.3.3`   | `@epanet-js/epanet-engine/v2.3.3-msx`        |
| v2.3.4   | `@epanet-js/epanet-engine/v2.3.4`   | `@epanet-js/epanet-engine/v2.3.4-msx`        |
| v2.3.5   | `@epanet-js/epanet-engine/v2.3.5`   | `@epanet-js/epanet-engine/v2.3.5-msx`        |
| master   | `@epanet-js/epanet-engine/master`   | `@epanet-js/epanet-engine/master-msx`        |
| dev      | `@epanet-js/epanet-engine/dev`      | `@epanet-js/epanet-engine/dev-msx`           |
| **LTS**  | -                                   | `@epanet-js/epanet-engine/lts` (single-file, see above) |

## API

### `loader(factory)`

```ts
function loader<T extends object>(factory: () => Promise<T>): Promise<EpanetEngineRuntime & T>
```

Initialises a WASM module and returns a proxy that exposes every exported C function under its unprefixed name alongside the Emscripten runtime. Both spellings work: `f.EN_open(...)` and `f._EN_open(...)`.

**Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `factory` | `() => Promise<object>` | The default export of a versioned sub-path, optionally called with `{ wasmBinary }` |

**Returned object**

| Property | Description |
|----------|-------------|
| `EN_*` / `MSX*` | All exported C functions from the EPANET / MSX API |
| `FS` | Emscripten virtual file system (`readFile`, `writeFile`, etc.) |
| `malloc(size)` / `free(ptr)` | Raw memory allocation |
| `allocateUTF8(str)` | Allocate a C string; free the returned pointer when done |
| `getValue(ptr, type)` / `setValue(ptr, value, type)` | Read/write typed values at a memory address |
| `UTF8ToString(ptr)` | Convert a C string pointer to a JS string |

## Memory management

EPANET uses opaque project handles returned through output pointer arguments. The typical pattern:

```js
// Allocate a 4-byte buffer, read the handle, then free the buffer
const phPtr = f.malloc(4)
f.EN_createproject(phPtr)
const ph = f.getValue(phPtr, 'i32')
f.free(phPtr)

// Allocate C strings, use them, then free
const ptr = f.allocateUTF8('filename.inp')
f.EN_someFunction(ph, ptr)
f.free(ptr)
```

Always free string and pointer allocations after use to avoid memory leaks inside the WASM heap.

## Building from source

Requires [Docker](https://www.docker.com/) (recommended) or a local [emsdk](https://emscripten.org/) installation.

```sh
# Build the Docker image once
npm run build:image

# Build all WASM artifacts inside the container
npm run build:docker

# Or build locally if emsdk is on PATH
npm run build
```

The build produces versioned artifacts under `dist/` and a single-file LTS build at `dist/lts/`.
