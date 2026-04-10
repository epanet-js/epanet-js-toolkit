import { it, expect } from 'vitest'
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

it.each(VERSIONS)('EPANET-MSX %s produces correct simulation results', async (version) => {
  const f = await loadEpanet(version)

  f.FS.writeFile('net.inp', readFileSync(join(__dirname, 'network_msx.inp')))
  f.FS.writeFile('net.msx', readFileSync(join(__dirname, 'network_msx.msx')))

  const phPtr = f.malloc(4)
  f.EN_createproject(phPtr)
  const ph = f.getValue(phPtr, 'i32')
  f.free(phPtr)

  const inpPtr = f.allocateUTF8('net.inp')
  const rptPtr = f.allocateUTF8('net.rpt')
  const outPtr = f.allocateUTF8('net.out')
  const enOpenResult = f.EN_open(ph, inpPtr, rptPtr, outPtr)
  f.free(inpPtr)
  f.free(rptPtr)
  f.free(outPtr)

  expect(enOpenResult, `EN_open failed: ${enOpenResult}`).toBe(0)

  const msxPtr = f.allocateUTF8('net.msx')
  const msxOpenResult = f.MSXopen(ph, msxPtr)
  f.free(msxPtr)

  expect(msxOpenResult, `MSXopen failed: ${msxOpenResult}`).toBe(0)

  f.MSXsolveH()
  f.MSXsolveQ()
  f.MSXreport()

  const rpt = f.FS.readFile('net.rpt', { encoding: 'utf8' })
  const msxRpt = f.FS.readFile('msxreport.txt', { encoding: 'utf8' })
  expect(rpt.length, 'net.rpt must not be empty').toBeGreaterThan(0)
  expect(msxRpt.length, 'msxreport.txt must not be empty').toBeGreaterThan(0)

  f.MSXclose()
  f.EN_close(ph)
  f.EN_deleteproject(ph)
})

it.each(VERSIONS)('EPANET-MSX %s allows injecting hydraulics results file from EPANET', async (version) => {
  const f = await loadEpanet(version)

  f.FS.writeFile('net.inp', readFileSync(join(__dirname, 'network_msx.inp')))
  f.FS.writeFile('net.msx', readFileSync(join(__dirname, 'network_msx.msx')))

  const phPtr = f.malloc(4)
  f.EN_createproject(phPtr)
  const ph = f.getValue(phPtr, 'i32')
  f.free(phPtr)

  const inpPtr = f.allocateUTF8('net.inp')
  const rptPtr = f.allocateUTF8('net.rpt')
  const outPtr = f.allocateUTF8('net.out')
  const enOpenResult = f.EN_open(ph, inpPtr, rptPtr, outPtr)
  f.free(inpPtr)
  f.free(rptPtr)
  f.free(outPtr)

  expect(enOpenResult, `EN_open failed: ${enOpenResult}`).toBe(0)

  f.EN_solveH(ph)

  const hydFilePtr = f.allocateUTF8('results.hyd')
  const saveHydFileResult = f.EN_savehydfile(ph, hydFilePtr)
  expect(saveHydFileResult, `EN_savehydfile failed: ${saveHydFileResult}`).toBe(0)

  const msxPtr = f.allocateUTF8('net.msx')
  const msxOpenResult = f.MSXopen(ph, msxPtr)
  f.free(msxPtr)

  expect(msxOpenResult, `MSXopen failed: ${msxOpenResult}`).toBe(0)

  const useHydFileResult = f.MSXusehydfile(hydFilePtr)
  f.free(hydFilePtr)
  expect(useHydFileResult, `MSXusehydfile failed: ${useHydFileResult}`).toBe(0)

  f.MSXsolveQ()
  f.MSXreport()

  const rpt = f.FS.readFile('net.rpt', { encoding: 'utf8' })
  const msxRpt = f.FS.readFile('msxreport.txt', { encoding: 'utf8' })
  expect(rpt.length, 'net.rpt must not be empty').toBeGreaterThan(0)
  expect(msxRpt.length, 'msxreport.txt must not be empty').toBeGreaterThan(0)

  f.MSXclose()
  f.EN_close(ph)
  f.EN_deleteproject(ph)
})

async function loadEpanet(version) {
  const { default: factory } = await import(`../dist/${version}-msx/EpanetEngine.js`)
  const wasmBinary = readFileSync(join(__dirname, `../dist/${version}-msx/EpanetEngine.wasm`))
  return await loader(() => factory({ wasmBinary }))
}
