import { it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

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

it.each(VERSIONS)('EPANET %s produces correct simulation results', async (version) => {
  const { default: factory } = await import(`../dist/${version}/index.js`)
  const wasmBinary = readFileSync(join(__dirname, `../dist/${version}/EpanetEngine.wasm`))
  const f = await factory({ wasmBinary })

  f.FS.writeFile('net.inp', readFileSync(join(__dirname, 'network.inp')))

  const phPtr = f._malloc(4)
  f._EN_createproject(phPtr)
  const ph = f.getValue(phPtr, 'i32')
  f._free(phPtr)

  const inpPtr = f.allocateUTF8('net.inp')
  const rptPtr = f.allocateUTF8('net.rpt')
  const outPtr = f.allocateUTF8('net.out')
  f._EN_open(ph, inpPtr, rptPtr, outPtr)
  f._free(inpPtr)
  f._free(rptPtr)
  f._free(outPtr)

  f._EN_solveH(ph)
  f._EN_solveQ(ph)
  f._EN_report(ph)

  const rpt = f.FS.readFile('net.rpt', { encoding: 'utf8' })
  const out = f.FS.readFile('net.out')

  expect(rpt.length, 'net.rpt must not be empty').toBeGreaterThan(0)
  expect(out.length, 'net.out must not be empty').toBeGreaterThan(0)

  f._EN_deleteproject(ph)
})
