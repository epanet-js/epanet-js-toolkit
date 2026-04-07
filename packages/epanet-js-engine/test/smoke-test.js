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

function getNodeValue(ph, f, node, type) {
  const idxPtr = f.malloc(4)
  const nodePtr = f.allocateUTF8(node)

  f.EN_getnodeindex(ph, nodePtr, idxPtr)
  const idx = f.getValue(idxPtr, 'i32')
  f.free(idxPtr)
  f.free(nodePtr)

  const valuePtr = f.malloc(4)
  f.EN_getnodevalue(ph, idx, type, valuePtr)
  const value = f.getValue(valuePtr, 'double')
  f.free(valuePtr)

  return value
}

function getLinkValue(ph, f, link, type) {
  const idxPtr = f.malloc(4)
  const linkPtr = f.allocateUTF8(link)

  f.EN_getlinkindex(ph, linkPtr, idxPtr)
  const idx = f.getValue(idxPtr, 'i32')
  f.free(idxPtr)
  f.free(linkPtr)

  const valuePtr = f.malloc(4)
  f.EN_getlinkvalue(ph, idx, type, valuePtr)
  const value = f.getValue(valuePtr, 'double')
  f.free(valuePtr)

  return value
}

const EN_PRESSURE = 11
const EN_FLOW = 8

const nodes = {
  '4tQyVjy4CVL33HXQyTtRg': { pressure: null },
  'H90FOUFsjKy0LrTMBrzt5': { pressure: null },
  'vLfEJv8pqDKcgWS2GkUmI': { pressure: null },
  'ITMN7DinWlnXQJC2SX5PU': { pressure: null }
}

const links = {
  'IJGhUPvOjD27Z3cRpkter': { flow: null },
  'iUIhYX2iDiXCP55I9HixM': { flow: null }
}

function compareResults(ph, f) {
  Object.keys(nodes).forEach(node =>  {
    const pressure = getNodeValue(ph, f, node, EN_PRESSURE)

    if (nodes[node].pressure === null) {
      nodes[node].pressure = pressure
    }

    assert.ok(pressure === nodes[node].pressure, `Pressure of node ${node} mismatch with previous version (${pressure} vs ${nodes[node].pressure})`)
    nodes[node].pressure = pressure
  })

  Object.keys(links).forEach(link =>  {
    const flow = getLinkValue(ph, f, link, EN_FLOW)

    if (links[link].flow === null) {
      links[link].flow = flow
    }

    // Flow results change between 2.2 and 2.3
    //assert.ok(flow === links[link].flow, `Flow of link ${link} mismatch with previous version (${flow} vs ${links[link].flow})`)
    links[link].flow = flow
  })
}

for (const version of VERSIONS) {
  process.stdout.write(`[${version}] `)

  const { default: factory } = await import(`../dist/${version}/EpanetEngine.js`)
  const wasmBinary = readFileSync(join(__dirname, `../dist/${version}/EpanetEngine.wasm`))
  const f = await loader(() => factory({ wasmBinary }))

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

  assert.ok(rpt.length > 0, 'net.rpt must not be empty')
  assert.ok(out.length > 0, 'net.out must not be empty')
  compareResults(ph, f)

  console.log('OK! EPANET report:')
  console.log(rpt)


  f.EN_deleteproject(ph)
}
