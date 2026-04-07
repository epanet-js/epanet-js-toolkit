import assert from 'assert'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

import factory from '../dist/v2.3/EpanetEngine.js'
import { loader } from '../dist/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// The module is built with ENVIRONMENT=web, so fetch() would be used to load
// the .wasm file. In Node.js we bypass that by reading the binary from disk
// and passing it directly as wasmBinary.
const wasmBinary = readFileSync(join(__dirname, '../dist/v2.3/EpanetEngine.wasm'))
const f = await loader(() => factory({ wasmBinary }))

// Write the network file into the Emscripten virtual filesystem.
f.FS.writeFile('net.inp', readFileSync(join(__dirname, 'network.inp')))

// EN_createproject writes the project handle through a pointer argument.
// Allocate 4 bytes (WASM32 pointer size), retrieve the handle, then free.
const phPtr = f.malloc(4)
f.EN_createproject(phPtr)
const ph = f.getValue(phPtr, 'i32')
f.free(phPtr)

// String arguments must be encoded into WASM memory.
const inpPtr = f.allocateUTF8('net.inp')
const rptPtr = f.allocateUTF8('net.rpt')
const outPtr = f.allocateUTF8('net.out')
f.EN_open(ph, inpPtr, rptPtr, outPtr)
f.free(inpPtr)
f.free(rptPtr)
f.free(outPtr)

f.EN_solveH(ph)
f.EN_solveQ(ph)
f.EN_report(ph)
f.EN_deleteproject(ph)

// Both output files should have been written to the virtual filesystem.
const rpt = f.FS.readFile('net.rpt', { encoding: 'utf8' })
const out = f.FS.readFile('net.out')

assert.ok(rpt.length > 0, 'net.rpt must not be empty')
assert.ok(out.length > 0, 'net.out must not be empty')

console.log('OK')
console.log(rpt)
