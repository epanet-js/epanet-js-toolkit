import { it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

import { loader } from '../dist/index.js'
import * as factory from '../dist/lts/EpanetEngine.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

it('EPANET LTS (single-file) produces correct simulation results', async () => {
  const f = await loader(() => factory.default())

  f.FS.writeFile('net.inp', readFileSync(join(__dirname, 'network.inp')))

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
  f.EN_solveQ(ph)
  f.EN_report(ph)

  const rpt = f.FS.readFile('net.rpt', { encoding: 'utf8' })
  const out = f.FS.readFile('net.out')

  expect(rpt.length, 'net.rpt must not be empty').toBeGreaterThan(0)
  expect(out.length, 'net.out must not be empty').toBeGreaterThan(0)

  f.EN_deleteproject(ph)
})
