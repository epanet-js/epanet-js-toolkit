import assert from 'assert'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

import { loader } from '../dist/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const VERSIONS = [
  'v2.2',
  'v2.3',
  'v2.3.1',
  'v2.3.2',
  'v2.3.3',
  'v2.3.4',
  'v2.3.5',
  'master',
  'dev',
]

for (const version of VERSIONS) {
  process.stdout.write(`[${version}-msx] `)

  const { default: factory } = await import(`../dist/${version}-msx/EpanetEngine.js`)
  const wasmBinary = readFileSync(join(__dirname, `../dist/${version}-msx/EpanetEngine.wasm`))
  const f = await loader(() => factory({ wasmBinary }))

  f.FS.writeFile('net.inp', readFileSync(join(__dirname, 'network_msx.inp')))
  f.FS.writeFile('net.msx', readFileSync(join(__dirname, 'network_msx.msx')))

  const phPtr = f.malloc(4)
  f.EN_createproject(phPtr)
  const ph = f.getValue(phPtr, 'i32')
  f.free(phPtr)

  const inpPtr = f.allocateUTF8('net.inp')
  const rptPtr = f.allocateUTF8('net.rpt')
  const outPtr = f.allocateUTF8('net.out')
  f.EN_open(ph, inpPtr, rptPtr, outPtr)
  f.free(inpPtr)
  f.free(rptPtr)
  f.free(outPtr)

  f.EN_solveH(ph)

  const msxPtr = f.allocateUTF8('net.msx')
  f.MSXopen(msxPtr)
  f.free(msxPtr)

  f.MSXsolveH()
  f.MSXsolveQ()
  f.MSXreport()

  const rpt = f.FS.readFile('net.rpt', { encoding: 'utf8' })
  const out = f.FS.readFile('net.out')

  assert.ok(rpt.length > 0, 'net.rpt must not be empty')
  assert.ok(out.length > 0, 'net.out must not be empty')

  console.log('OK! MSX report:')
  console.log(rpt)

  f.MSXclose()
  f.EN_close(ph)
  f.EN_deleteproject(ph)
}
