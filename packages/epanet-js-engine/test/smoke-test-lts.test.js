import { it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

import * as EpanetEngine from '../dist/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

it('EPANET LTS (single-file) produces correct simulation results', async () => {
  const f = await EpanetEngine.default()

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
