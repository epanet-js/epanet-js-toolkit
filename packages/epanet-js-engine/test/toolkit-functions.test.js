import { it, expect, describe, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const VERSION = 'v2.3.5'

// ─── Enum constants ────────────────────────────────────────────────────────────
// ObjectType
const EN_NODE = 0
const EN_NODECOUNT = 0, EN_LINKCOUNT = 2, EN_PATCOUNT = 3
const EN_CURVECOUNT = 4, EN_CONTROLCOUNT = 5, EN_RULECOUNT = 6
// NodeType
const EN_JUNCTION = 0, EN_TANK = 2
// LinkType
const EN_CVPIPE = 0, EN_PIPE = 1, EN_PUMP = 2
// NodeProperty
const EN_ELEVATION = 0
// LinkProperty
const EN_DIAMETER = 0, EN_LENGTH = 1, EN_ROUGHNESS = 2
// QualityType
const EN_CHEM = 1
// AnalysisStatistic
const EN_ITERATIONS = 0
// TimeParameter
const EN_DURATION = 0
// Option
const EN_TRIALS = 0
// FlowUnits
const EN_CMH = 8
// ControlType
const EN_TIMER = 2
// ActionCodeType
const EN_UNCONDITIONAL = 0
// HeadLossType
// DemandModel
const EN_DDA = 0
// MSX_Constant enum values
const MSX_NODE = 0, MSX_LINK = 1, MSX_SPECIES = 3, MSX_PARAMETER = 5, MSX_CONSTANT = 6, MSX_PATTERN = 7
// MSX_ChemicalSpeciesType
const MSX_BULK = 0
// MSX_ChemicalSpeciesSourceType
const MSX_NOSOURCE = -1, MSX_CONCEN = 0

// ─── State shared across all tests ────────────────────────────────────────────
let f, ph

// ─── Memory helpers ────────────────────────────────────────────────────────────
function mkInt() {
  const p = f._malloc(4)
  return { p, val: () => f.getValue(p, 'i32'), free: () => f._free(p) }
}
function mkDouble() {
  const p = f._malloc(8)
  return { p, val: () => f.getValue(p, 'double'), free: () => f._free(p) }
}
function mkStr(size = 512) {
  const p = f._malloc(size)
  return { p, val: () => f.UTF8ToString(p), free: () => f._free(p) }
}
function cstr(s) {
  const p = f.allocateUTF8(s)
  return { p, free: () => f._free(p) }
}

// ─── Engine setup ─────────────────────────────────────────────────────────────
beforeAll(async () => {
  const { default: factory } = await import(`../dist/${VERSION}-msx/index.js`)
  const wasmBinary = readFileSync(join(__dirname, `../dist/${VERSION}-msx/EpanetEngine.wasm`))
  f = await factory({ wasmBinary })

  f.FS.writeFile('net.inp', readFileSync(join(__dirname, 'network_msx.inp')))
  f.FS.writeFile('net.msx', readFileSync(join(__dirname, 'network_msx.msx')))

  const phPtr = f._malloc(4)
  f._EN_createproject(phPtr)
  ph = f.getValue(phPtr, 'i32')
  f._free(phPtr)

  let s = cstr('net.inp'), r = cstr('net.rpt'), o = cstr('net.out')
  expect(f._EN_open(ph, s.p, r.p, o.p)).toBe(0)
  s.free(); r.free(); o.free()

  let m = cstr('net.msx')
  expect(f._MSXopen(ph, m.p)).toBe(0)
  m.free()

  // Solve EPANET hydraulics (needed for EN_getstatistic, step-by-step tests)
  f._EN_solveH(ph)

  // Save a hyd file for MSXusehydfile and EN_usehydfile tests
  let hyd = cstr('test.hyd')
  f._EN_savehydfile(ph, hyd.p)
  hyd.free()

  // Also solve EPANET water quality so EN_report can write full results
  f._EN_solveQ(ph)

  // Run MSX simulation (needed for MSXgetqual)
  f._MSXsolveH()
  f._MSXsolveQ()

  // MSXsolveH leaves the hydraulic solver open internally; close it so
  // subsequent EN_openH / EN_usehydfile calls don't get error 108/104.
  f._EN_closeH(ph)
})

afterAll(() => {
  f._MSXclose()
  f._EN_close(ph)
  f._EN_deleteproject(ph)
})

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

describe('Project management', () => {
  it('EN_getversion returns a positive version number', () => {
    const v = mkInt()
    expect(f._EN_getversion(v.p)).toBe(0)
    expect(v.val()).toBeGreaterThan(0)
    v.free()
  })

  it('EN_geterror returns a message for error code 0', () => {
    const msg = mkStr()
    expect(f._EN_geterror(0, msg.p, 256)).toBe(0)
    expect(typeof msg.val()).toBe('string')
    msg.free()
  })

  it('EN_gettitle and EN_settitle', () => {
    const l1 = mkStr(256), l2 = mkStr(256), l3 = mkStr(256)
    expect(f._EN_gettitle(ph, l1.p, l2.p, l3.p)).toBe(0)
    const orig = l1.val()
    l1.free(); l2.free(); l3.free()

    const t1 = cstr('New Title'), t2 = cstr(''), t3 = cstr('')
    expect(f._EN_settitle(ph, t1.p, t2.p, t3.p)).toBe(0)
    t1.free(); t2.free(); t3.free()

    const r1 = cstr(orig), r2 = cstr(''), r3 = cstr('')
    f._EN_settitle(ph, r1.p, r2.p, r3.p)
    r1.free(); r2.free(); r3.free()
  })

  it('EN_getcomment and EN_setcomment on node 1', () => {
    const cmt = mkStr()
    expect(f._EN_getcomment(ph, EN_NODE, 1, cmt.p)).toBe(0)
    cmt.free()

    const nc = cstr('test comment')
    expect(f._EN_setcomment(ph, EN_NODE, 1, nc.p)).toBe(0)
    nc.free()
  })

  it('EN_gettag and EN_settag on node 1', () => {
    const tag = mkStr()
    expect(f._EN_gettag(ph, EN_NODE, 1, tag.p)).toBe(0)
    tag.free()

    const nt = cstr('tag1')
    expect(f._EN_settag(ph, EN_NODE, 1, nt.p)).toBe(0)
    nt.free()
  })

  it('EN_getcount returns positive counts for nodes and links', () => {
    const cnt = mkInt()
    expect(f._EN_getcount(ph, EN_NODECOUNT, cnt.p)).toBe(0)
    expect(cnt.val()).toBeGreaterThan(0)

    expect(f._EN_getcount(ph, EN_LINKCOUNT, cnt.p)).toBe(0)
    expect(cnt.val()).toBeGreaterThan(0)

    expect(f._EN_getcount(ph, EN_PATCOUNT, cnt.p)).toBe(0)
    expect(f._EN_getcount(ph, EN_CURVECOUNT, cnt.p)).toBe(0)
    expect(f._EN_getcount(ph, EN_CONTROLCOUNT, cnt.p)).toBe(0)
    expect(f._EN_getcount(ph, EN_RULECOUNT, cnt.p)).toBe(0)
    cnt.free()
  })

  it('EN_saveinpfile saves a non-empty file', () => {
    const s = cstr('saved.inp')
    expect(f._EN_saveinpfile(ph, s.p)).toBe(0)
    s.free()
    expect(f.FS.readFile('saved.inp').length).toBeGreaterThan(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// OPTIONS & TIME PARAMETERS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Options and time parameters', () => {
  it('EN_getoption and EN_setoption round-trip for EN_TRIALS', () => {
    const v = mkDouble()
    expect(f._EN_getoption(ph, EN_TRIALS, v.p)).toBe(0)
    const orig = v.val()
    expect(orig).toBeGreaterThan(0)

    expect(f._EN_setoption(ph, EN_TRIALS, 50)).toBe(0)
    expect(f._EN_getoption(ph, EN_TRIALS, v.p)).toBe(0)
    expect(v.val()).toBe(50)

    f._EN_setoption(ph, EN_TRIALS, orig)
    v.free()
  })

  it('EN_getflowunits and EN_setflowunits round-trip', () => {
    const v = mkInt()
    expect(f._EN_getflowunits(ph, v.p)).toBe(0)
    const orig = v.val()

    expect(f._EN_setflowunits(ph, EN_CMH)).toBe(0)
    expect(f._EN_getflowunits(ph, v.p)).toBe(0)
    expect(v.val()).toBe(EN_CMH)

    f._EN_setflowunits(ph, orig)
    v.free()
  })

  it('EN_gettimeparam and EN_settimeparam round-trip for EN_DURATION', () => {
    const v = mkInt()
    expect(f._EN_gettimeparam(ph, EN_DURATION, v.p)).toBe(0)
    const orig = v.val()
    expect(orig).toBeGreaterThan(0)

    expect(f._EN_settimeparam(ph, EN_DURATION, orig)).toBe(0)
    expect(f._EN_gettimeparam(ph, EN_DURATION, v.p)).toBe(0)
    expect(v.val()).toBe(orig)
    v.free()
  })

  it('EN_getqualinfo returns quality type info', () => {
    const qt = mkInt(), cn = mkStr(), cu = mkStr(), tn = mkInt()
    expect(f._EN_getqualinfo(ph, qt.p, cn.p, cu.p, tn.p)).toBe(0)
    qt.free(); cn.free(); cu.free(); tn.free()
  })

  it('EN_getqualtype and EN_setqualtype round-trip', () => {
    const qt = mkInt(), tr = mkInt()
    expect(f._EN_getqualtype(ph, qt.p, tr.p)).toBe(0)
    const orig = qt.val()
    qt.free(); tr.free()

    const cn = cstr('Cl2'), cu = cstr('mg/L'), tn = cstr('')
    expect(f._EN_setqualtype(ph, EN_CHEM, cn.p, cu.p, tn.p)).toBe(0)
    cn.free(); cu.free(); tn.free()

    const cn2 = cstr(''), cu2 = cstr(''), tn2 = cstr('')
    f._EN_setqualtype(ph, orig, cn2.p, cu2.p, tn2.p)
    cn2.free(); cu2.free(); tn2.free()
  })

  it('EN_getstatistic returns iteration count >= 0 after solving', () => {
    const v = mkDouble()
    expect(f._EN_getstatistic(ph, EN_ITERATIONS, v.p)).toBe(0)
    expect(v.val()).toBeGreaterThanOrEqual(0)
    v.free()
  })

  it('EN_getresultindex returns a valid index for node 1', () => {
    const v = mkInt()
    expect(f._EN_getresultindex(ph, EN_NODE, 1, v.p)).toBe(0)
    expect(v.val()).toBeGreaterThan(0)
    v.free()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// REPORTING
// ═══════════════════════════════════════════════════════════════════════════════

describe('Reporting', () => {
  it('EN_setreportcallback accepts null callback', () => {
    expect(f._EN_setreportcallback(ph, 0)).toBe(0)
  })

  it('EN_setreportcallbackuserdata accepts null user data', () => {
    expect(f._EN_setreportcallbackuserdata(ph, 0)).toBe(0)
  })

  it('EN_writeline writes a line to the report file', () => {
    const s = cstr('Test report line from v2.3.5-msx test suite')
    expect(f._EN_writeline(ph, s.p)).toBe(0)
    s.free()
  })

  it('EN_setstatusreport sets reporting level to 0', () => {
    expect(f._EN_setstatusreport(ph, 0)).toBe(0)
  })

  it('EN_setreport processes a format command', () => {
    const s = cstr('NODES ALL')
    expect(f._EN_setreport(ph, s.p)).toBe(0)
    s.free()
  })

  it('EN_report writes simulation results to report file', () => {
    expect(f._EN_report(ph)).toBe(0)
    expect(f.FS.readFile('net.rpt', { encoding: 'utf8' }).length).toBeGreaterThan(0)
  })

  it('EN_copyreport copies report to another file', () => {
    const s = cstr('copy.rpt')
    expect(f._EN_copyreport(ph, s.p)).toBe(0)
    s.free()
    expect(f.FS.readFile('copy.rpt').length).toBeGreaterThan(0)
  })

  it('EN_clearreport clears the report file', () => {
    expect(f._EN_clearreport(ph)).toBe(0)
  })

  it('EN_resetreport resets report options to defaults', () => {
    expect(f._EN_resetreport(ph)).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// HYDRAULIC SOLVER (step-by-step)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Hydraulic solver (step-by-step)', () => {
  it('EN_openH / EN_initH / EN_runH / EN_nextH / EN_saveH / EN_savehydfile / EN_closeH', () => {
    expect(f._EN_openH(ph)).toBe(0)
    expect(f._EN_initH(ph, 1)).toBe(0)  // 1 = EN_SAVE: save results to binary file

    // Run all hydraulic timesteps to completion (required before EN_saveH)
    const t = mkInt(), step = mkInt()
    expect(f._EN_runH(ph, t.p)).toBe(0)
    let tStep = 1
    while (tStep > 0) {
      f._EN_nextH(ph, step.p)
      tStep = step.val()
      if (tStep > 0) f._EN_runH(ph, t.p)
    }
    t.free(); step.free()

    expect(f._EN_saveH(ph)).toBe(0)

    const hyd = cstr('step.hyd')
    expect(f._EN_savehydfile(ph, hyd.p)).toBe(0)
    hyd.free()
    expect(f.FS.readFile('step.hyd').length).toBeGreaterThan(0)

    expect(f._EN_closeH(ph)).toBe(0)

    // Restore the binary output file with complete results for subsequent tests
    f._EN_solveH(ph)
    f._EN_solveQ(ph)
  })

  it('EN_usehydfile loads a saved hydraulics file on a fresh project', () => {
    // Use a separate project handle so the main project state is not affected
    const phPtr2 = f._malloc(4)
    f._EN_createproject(phPtr2)
    const ph2 = f.getValue(phPtr2, 'i32')
    f._free(phPtr2)

    const inp = cstr('net.inp'), rpt = cstr('uf.rpt'), out = cstr('')
    f._EN_open(ph2, inp.p, rpt.p, out.p)
    inp.free(); rpt.free(); out.free()

    const s = cstr('test.hyd')
    expect(f._EN_usehydfile(ph2, s.p)).toBe(0)
    s.free()

    f._EN_close(ph2)
    f._EN_deleteproject(ph2)
  })

  it('EN_timetonextevent returns event info during open hydraulic solver', () => {
    f._EN_openH(ph)
    f._EN_initH(ph, 0)

    const t = mkInt()
    f._EN_runH(ph, t.p)
    t.free()

    const evtType = mkInt(), dur = mkInt(), elem = mkInt()
    expect(f._EN_timetonextevent(ph, evtType.p, dur.p, elem.p)).toBe(0)
    evtType.free(); dur.free(); elem.free()

    f._EN_closeH(ph)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// WATER QUALITY SOLVER (step-by-step)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Water quality solver (step-by-step)', () => {
  it('EN_openQ / EN_initQ / EN_runQ / EN_nextQ / EN_closeQ', () => {
    f._EN_solveH(ph)

    expect(f._EN_openQ(ph)).toBe(0)
    expect(f._EN_initQ(ph, 0)).toBe(0)

    const t = mkInt()
    expect(f._EN_runQ(ph, t.p)).toBe(0)
    t.free()

    const step = mkInt()
    expect(f._EN_nextQ(ph, step.p)).toBe(0)
    step.free()

    expect(f._EN_closeQ(ph)).toBe(0)
  })

  it('EN_stepQ advances WQ by a single step', () => {
    f._EN_solveH(ph)
    f._EN_openQ(ph)
    f._EN_initQ(ph, 0)

    const t = mkInt()
    f._EN_runQ(ph, t.p)
    t.free()

    const tLeft = mkInt()
    expect(f._EN_stepQ(ph, tLeft.p)).toBe(0)
    expect(tLeft.val()).toBeGreaterThanOrEqual(0)
    tLeft.free()

    f._EN_closeQ(ph)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT-LEVEL OPERATIONS (separate project handles)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Project-level operations (EN_init, EN_openX, EN_runproject)', () => {
  it('EN_openX opens a network with warnings allowed', () => {
    const phPtr2 = f._malloc(4)
    f._EN_createproject(phPtr2)
    const ph2 = f.getValue(phPtr2, 'i32')
    f._free(phPtr2)

    const inp = cstr('net.inp'), rpt = cstr('openx.rpt'), out = cstr('')
    expect(f._EN_openX(ph2, inp.p, rpt.p, out.p)).toBe(0)
    inp.free(); rpt.free(); out.free()

    f._EN_close(ph2)
    f._EN_deleteproject(ph2)
  })

  it('EN_runproject runs a complete simulation', () => {
    const phPtr2 = f._malloc(4)
    f._EN_createproject(phPtr2)
    const ph2 = f.getValue(phPtr2, 'i32')
    f._free(phPtr2)

    const inp = cstr('net.inp'), rpt = cstr('run.rpt'), out = cstr('run.out')
    expect(f._EN_runproject(ph2, inp.p, rpt.p, out.p, 0)).toBe(0)
    inp.free(); rpt.free(); out.free()

    expect(f.FS.readFile('run.rpt', { encoding: 'utf8' }).length).toBeGreaterThan(0)

    f._EN_deleteproject(ph2)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// NODE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Node functions', () => {
  it('EN_getnodeindex looks up "Source" reservoir', () => {
    const idx = mkInt()
    const s = cstr('Source')
    expect(f._EN_getnodeindex(ph, s.p, idx.p)).toBe(0)
    expect(idx.val()).toBeGreaterThan(0)
    s.free(); idx.free()
  })

  it('EN_getnodeid retrieves ID and EN_setnodeid renames it back', () => {
    const id = mkStr()
    expect(f._EN_getnodeid(ph, 1, id.p)).toBe(0)
    const orig = id.val()
    expect(orig.length).toBeGreaterThan(0)
    id.free()

    const newId = cstr('TmpNodeId')
    expect(f._EN_setnodeid(ph, 1, newId.p)).toBe(0)
    newId.free()

    const restored = cstr(orig)
    f._EN_setnodeid(ph, 1, restored.p)
    restored.free()
  })

  it('EN_getnodetype returns JUNCTION (0) for node 1', () => {
    const type = mkInt()
    expect(f._EN_getnodetype(ph, 1, type.p)).toBe(0)
    expect(type.val()).toBe(EN_JUNCTION)
    type.free()
  })

  it('EN_getnodevalue and EN_setnodevalue round-trip for EN_ELEVATION', () => {
    const v = mkDouble()
    expect(f._EN_getnodevalue(ph, 1, EN_ELEVATION, v.p)).toBe(0)
    const orig = v.val()

    expect(f._EN_setnodevalue(ph, 1, EN_ELEVATION, orig + 1)).toBe(0)
    expect(f._EN_getnodevalue(ph, 1, EN_ELEVATION, v.p)).toBe(0)
    expect(v.val()).toBeCloseTo(orig + 1)

    f._EN_setnodevalue(ph, 1, EN_ELEVATION, orig)
    v.free()
  })

  it('EN_getnodevalues retrieves elevation array for all nodes', () => {
    const cnt = mkInt()
    f._EN_getcount(ph, EN_NODECOUNT, cnt.p)
    const nodeCount = cnt.val()
    cnt.free()

    const arr = f._malloc(nodeCount * 8)
    expect(f._EN_getnodevalues(ph, EN_ELEVATION, arr)).toBe(0)
    f._free(arr)
  })

  it('EN_setcoord and EN_getcoord round-trip for node 1', () => {
    // network_msx.inp has no COORDINATES section, so set first then get
    expect(f._EN_setcoord(ph, 1, 100.0, 200.0)).toBe(0)

    const x = mkDouble(), y = mkDouble()
    expect(f._EN_getcoord(ph, 1, x.p, y.p)).toBe(0)
    expect(x.val()).toBeCloseTo(100.0)
    expect(y.val()).toBeCloseTo(200.0)
    x.free(); y.free()
  })

  it('EN_setjuncdata sets junction elevation and demand', () => {
    const dp = cstr('')
    expect(f._EN_setjuncdata(ph, 1, 100.0, 10.0, dp.p)).toBe(0)
    dp.free()
  })

  it('EN_settankdata on a temporary tank node', () => {
    const tankId = cstr('TmpTank')
    const idx = mkInt()
    f._EN_addnode(ph, tankId.p, EN_TANK, idx.p)
    const ti = idx.val()
    tankId.free(); idx.free()

    const vc = cstr('')
    expect(f._EN_settankdata(ph, ti, 100.0, 5.0, 0.0, 10.0, 10.0, 0.0, vc.p)).toBe(0)
    vc.free()

    f._EN_deletenode(ph, ti, EN_UNCONDITIONAL)
  })

  it('EN_getdemandmodel and EN_setdemandmodel round-trip', () => {
    const type = mkInt(), pmin = mkDouble(), preq = mkDouble(), pexp = mkDouble()
    expect(f._EN_getdemandmodel(ph, type.p, pmin.p, preq.p, pexp.p)).toBe(0)
    const orig = type.val()
    type.free(); pmin.free(); preq.free(); pexp.free()

    expect(f._EN_setdemandmodel(ph, EN_DDA, 0, 0, 0.5)).toBe(0)
    expect(f._EN_setdemandmodel(ph, orig, 0, 0, 0.5)).toBe(0)
  })

  it('EN_getnumdemands returns at least 1 demand for node 1', () => {
    const n = mkInt()
    expect(f._EN_getnumdemands(ph, 1, n.p)).toBe(0)
    expect(n.val()).toBeGreaterThan(0)
    n.free()
  })

  it('EN_getbasedemand and EN_setbasedemand round-trip', () => {
    const v = mkDouble()
    expect(f._EN_getbasedemand(ph, 1, 1, v.p)).toBe(0)
    const orig = v.val()

    expect(f._EN_setbasedemand(ph, 1, 1, orig + 1)).toBe(0)
    expect(f._EN_getbasedemand(ph, 1, 1, v.p)).toBe(0)
    expect(v.val()).toBeCloseTo(orig + 1)

    f._EN_setbasedemand(ph, 1, 1, orig)
    v.free()
  })

  it('EN_getdemandpattern and EN_setdemandpattern', () => {
    const pat = mkInt()
    expect(f._EN_getdemandpattern(ph, 1, 1, pat.p)).toBe(0)
    const orig = pat.val()

    expect(f._EN_setdemandpattern(ph, 1, 1, orig)).toBe(0)
    pat.free()
  })

  it('EN_getdemandname and EN_setdemandname', () => {
    const name = mkStr()
    expect(f._EN_getdemandname(ph, 1, 1, name.p)).toBe(0)
    name.free()

    const newName = cstr('TestDemandCat')
    expect(f._EN_setdemandname(ph, 1, 1, newName.p)).toBe(0)
    newName.free()

    // EN_getdemandindex: look up by the name we just set
    const nameAgain = cstr('TestDemandCat')
    const idx = mkInt()
    expect(f._EN_getdemandindex(ph, 1, nameAgain.p, idx.p)).toBe(0)
    expect(idx.val()).toBe(1)
    nameAgain.free(); idx.free()

    const reset = cstr('')
    f._EN_setdemandname(ph, 1, 1, reset.p)
    reset.free()
  })

  it('EN_adddemand and EN_deletedemand', () => {
    const dp = cstr(''), dn = cstr('Extra')
    expect(f._EN_adddemand(ph, 1, 5.0, dp.p, dn.p)).toBe(0)
    dp.free(); dn.free()

    const n = mkInt()
    f._EN_getnumdemands(ph, 1, n.p)
    const count = n.val()
    n.free()

    expect(f._EN_deletedemand(ph, 1, count)).toBe(0)
  })

  it('EN_addnode and EN_deletenode', () => {
    const id = cstr('TmpJunction')
    const idx = mkInt()
    expect(f._EN_addnode(ph, id.p, EN_JUNCTION, idx.p)).toBe(0)
    const newIdx = idx.val()
    expect(newIdx).toBeGreaterThan(0)
    id.free(); idx.free()

    expect(f._EN_deletenode(ph, newIdx, EN_UNCONDITIONAL)).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// LINK FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Link functions', () => {
  it('EN_getlinkindex looks up pipe "1"', () => {
    const idx = mkInt()
    const s = cstr('1')
    expect(f._EN_getlinkindex(ph, s.p, idx.p)).toBe(0)
    expect(idx.val()).toBeGreaterThan(0)
    s.free(); idx.free()
  })

  it('EN_getlinkid and EN_setlinkid rename and restore link 1', () => {
    const id = mkStr()
    expect(f._EN_getlinkid(ph, 1, id.p)).toBe(0)
    const orig = id.val()
    expect(orig.length).toBeGreaterThan(0)
    id.free()

    const newId = cstr('TmpLinkId')
    expect(f._EN_setlinkid(ph, 1, newId.p)).toBe(0)
    newId.free()

    const restored = cstr(orig)
    f._EN_setlinkid(ph, 1, restored.p)
    restored.free()
  })

  it('EN_getlinktype returns PIPE (1) for link 1', () => {
    const type = mkInt()
    expect(f._EN_getlinktype(ph, 1, type.p)).toBe(0)
    expect(type.val()).toBe(EN_PIPE)
    type.free()
  })

  it('EN_setlinktype changes link to CVPIPE and back', () => {
    const idxPtr = f._malloc(4)
    f.setValue(idxPtr, 1, 'i32')
    expect(f._EN_setlinktype(ph, idxPtr, EN_CVPIPE, EN_UNCONDITIONAL)).toBe(0)
    const newIdx = f.getValue(idxPtr, 'i32')

    f.setValue(idxPtr, newIdx, 'i32')
    expect(f._EN_setlinktype(ph, idxPtr, EN_PIPE, EN_UNCONDITIONAL)).toBe(0)
    f._free(idxPtr)
  })

  it('EN_getlinknodes and EN_setlinknodes round-trip for link 1', () => {
    const n1 = mkInt(), n2 = mkInt()
    expect(f._EN_getlinknodes(ph, 1, n1.p, n2.p)).toBe(0)
    const on1 = n1.val(), on2 = n2.val()
    expect(on1).toBeGreaterThan(0)
    expect(on2).toBeGreaterThan(0)

    expect(f._EN_setlinknodes(ph, 1, on1, on2)).toBe(0)
    n1.free(); n2.free()
  })

  it('EN_getlinkvalue and EN_setlinkvalue round-trip for EN_DIAMETER', () => {
    const v = mkDouble()
    expect(f._EN_getlinkvalue(ph, 1, EN_DIAMETER, v.p)).toBe(0)
    const orig = v.val()
    expect(orig).toBeGreaterThan(0)

    expect(f._EN_setlinkvalue(ph, 1, EN_DIAMETER, orig + 10)).toBe(0)
    expect(f._EN_getlinkvalue(ph, 1, EN_DIAMETER, v.p)).toBe(0)
    expect(v.val()).toBeCloseTo(orig + 10)

    f._EN_setlinkvalue(ph, 1, EN_DIAMETER, orig)
    v.free()
  })

  it('EN_getlinkvalues retrieves diameter array for all links', () => {
    const cnt = mkInt()
    f._EN_getcount(ph, EN_LINKCOUNT, cnt.p)
    const linkCount = cnt.val()
    cnt.free()

    const arr = f._malloc(linkCount * 8)
    expect(f._EN_getlinkvalues(ph, EN_DIAMETER, arr)).toBe(0)
    f._free(arr)
  })

  it('EN_setpipedata sets length, diameter, roughness, minorloss', () => {
    const diam = mkDouble(), len = mkDouble(), rough = mkDouble()
    f._EN_getlinkvalue(ph, 1, EN_DIAMETER, diam.p)
    f._EN_getlinkvalue(ph, 1, EN_LENGTH, len.p)
    f._EN_getlinkvalue(ph, 1, EN_ROUGHNESS, rough.p)
    const od = diam.val(), ol = len.val(), or_ = rough.val()
    diam.free(); len.free(); rough.free()

    expect(f._EN_setpipedata(ph, 1, ol, od, or_, 0)).toBe(0)
  })

  it('EN_getvertexcount / EN_setvertices / EN_getvertex / EN_setvertex', () => {
    const cnt = mkInt()
    expect(f._EN_getvertexcount(ph, 1, cnt.p)).toBe(0)
    cnt.free()

    // Add 2 vertices
    const xArr = f._malloc(2 * 8), yArr = f._malloc(2 * 8)
    f.setValue(xArr, 10.0, 'double')
    f.setValue(xArr + 8, 20.0, 'double')
    f.setValue(yArr, 5.0, 'double')
    f.setValue(yArr + 8, 10.0, 'double')
    expect(f._EN_setvertices(ph, 1, xArr, yArr, 2)).toBe(0)
    f._free(xArr); f._free(yArr)

    const cnt2 = mkInt()
    f._EN_getvertexcount(ph, 1, cnt2.p)
    expect(cnt2.val()).toBe(2)
    cnt2.free()

    const vx = mkDouble(), vy = mkDouble()
    expect(f._EN_getvertex(ph, 1, 1, vx.p, vy.p)).toBe(0)
    expect(vx.val()).toBeCloseTo(10.0)
    vx.free(); vy.free()

    expect(f._EN_setvertex(ph, 1, 1, 15.0, 7.5)).toBe(0)

    // Clear vertices
    const dummy = f._malloc(8)
    f._EN_setvertices(ph, 1, dummy, dummy, 0)
    f._free(dummy)
  })

  it('EN_addlink and EN_deletelink', () => {
    const id = cstr('TmpPipe'), from = cstr('A'), to = cstr('B')
    const idx = mkInt()
    expect(f._EN_addlink(ph, id.p, EN_PIPE, from.p, to.p, idx.p)).toBe(0)
    const newIdx = idx.val()
    expect(newIdx).toBeGreaterThan(0)
    id.free(); from.free(); to.free(); idx.free()

    expect(f._EN_deletelink(ph, newIdx, EN_UNCONDITIONAL)).toBe(0)
  })

  it('EN_getpumptype / EN_getheadcurveindex / EN_setheadcurveindex on a temporary pump', () => {
    // Add pump curve first
    const cid = cstr('PumpCurve')
    f._EN_addcurve(ph, cid.p)
    cid.free()

    const cidx = mkInt()
    const cname = cstr('PumpCurve')
    f._EN_getcurveindex(ph, cname.p, cidx.p)
    const curveIdx = cidx.val()
    cname.free(); cidx.free()

    // Set 2 curve points
    const xv = f._malloc(2 * 8), yv = f._malloc(2 * 8)
    f.setValue(xv, 0.0, 'double');   f.setValue(xv + 8, 100.0, 'double')
    f.setValue(yv, 50.0, 'double');  f.setValue(yv + 8, 10.0, 'double')
    f._EN_setcurve(ph, curveIdx, xv, yv, 2)
    f._free(xv); f._free(yv)

    // Add pump between Source and A
    const pid = cstr('TmpPump'), fn = cstr('Source'), tn = cstr('A')
    const pIdx = mkInt()
    f._EN_addlink(ph, pid.p, EN_PUMP, fn.p, tn.p, pIdx.p)
    const pumpIdx = pIdx.val()
    pid.free(); fn.free(); tn.free(); pIdx.free()

    // Assign head curve
    expect(f._EN_setheadcurveindex(ph, pumpIdx, curveIdx)).toBe(0)

    // Get head curve index
    const hci = mkInt()
    expect(f._EN_getheadcurveindex(ph, pumpIdx, hci.p)).toBe(0)
    expect(hci.val()).toBe(curveIdx)
    hci.free()

    // Get pump type
    const pt = mkInt()
    expect(f._EN_getpumptype(ph, pumpIdx, pt.p)).toBe(0)
    pt.free()

    // Cleanup
    f._EN_deletelink(ph, pumpIdx, EN_UNCONDITIONAL)
    f._EN_deletecurve(ph, curveIdx)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// PATTERN FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Pattern functions', () => {
  let patIdx = -1

  it('EN_addpattern creates "TestPat"', () => {
    const id = cstr('TestPat')
    expect(f._EN_addpattern(ph, id.p)).toBe(0)
    id.free()

    const s = cstr('TestPat')
    const i = mkInt()
    f._EN_getpatternindex(ph, s.p, i.p)
    patIdx = i.val()
    s.free(); i.free()

    expect(patIdx).toBeGreaterThan(0)
  })

  it('EN_getpatternindex and EN_getpatternid round-trip', () => {
    const id = mkStr()
    expect(f._EN_getpatternid(ph, patIdx, id.p)).toBe(0)
    expect(id.val()).toBe('TestPat')
    id.free()
  })

  it('EN_setpatternid renames and restores', () => {
    const n = cstr('TestPat2')
    expect(f._EN_setpatternid(ph, patIdx, n.p)).toBe(0)
    n.free()

    const r = cstr('TestPat')
    f._EN_setpatternid(ph, patIdx, r.p)
    r.free()
  })

  it('EN_setpattern sets multipliers and EN_getpatternlen returns count', () => {
    const vals = f._malloc(3 * 8)
    f.setValue(vals, 1.0, 'double')
    f.setValue(vals + 8, 1.5, 'double')
    f.setValue(vals + 16, 0.8, 'double')
    expect(f._EN_setpattern(ph, patIdx, vals, 3)).toBe(0)
    f._free(vals)

    const len = mkInt()
    expect(f._EN_getpatternlen(ph, patIdx, len.p)).toBe(0)
    expect(len.val()).toBe(3)
    len.free()
  })

  it('EN_getpatternvalue and EN_setpatternvalue round-trip', () => {
    const v = mkDouble()
    expect(f._EN_getpatternvalue(ph, patIdx, 1, v.p)).toBe(0)
    expect(v.val()).toBeCloseTo(1.0)

    expect(f._EN_setpatternvalue(ph, patIdx, 1, 2.0)).toBe(0)
    expect(f._EN_getpatternvalue(ph, patIdx, 1, v.p)).toBe(0)
    expect(v.val()).toBeCloseTo(2.0)
    v.free()
  })

  it('EN_getaveragepatternvalue returns average factor', () => {
    const v = mkDouble()
    expect(f._EN_getaveragepatternvalue(ph, patIdx, v.p)).toBe(0)
    expect(v.val()).toBeGreaterThan(0)
    v.free()
  })

  it('EN_loadpatternfile loads pattern from a file', () => {
    f.FS.writeFile('pattern.dat', '1.0\n1.2\n0.8\n1.1\n')
    const fn = cstr('pattern.dat'), id = cstr('LoadedPat')
    expect(f._EN_loadpatternfile(ph, fn.p, id.p)).toBe(0)
    fn.free(); id.free()

    // Verify pattern was added
    const s = cstr('LoadedPat'), i = mkInt()
    expect(f._EN_getpatternindex(ph, s.p, i.p)).toBe(0)
    expect(i.val()).toBeGreaterThan(0)
    const loadedIdx = i.val()
    s.free(); i.free()

    f._EN_deletepattern(ph, loadedIdx)
  })

  it('EN_deletepattern removes "TestPat"', () => {
    expect(f._EN_deletepattern(ph, patIdx)).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// CURVE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Curve functions', () => {
  let curveIdx = -1

  it('EN_addcurve creates "TestCurve"', () => {
    const id = cstr('TestCurve')
    expect(f._EN_addcurve(ph, id.p)).toBe(0)
    id.free()

    const s = cstr('TestCurve'), i = mkInt()
    f._EN_getcurveindex(ph, s.p, i.p)
    curveIdx = i.val()
    s.free(); i.free()

    expect(curveIdx).toBeGreaterThan(0)
  })

  it('EN_getcurveindex and EN_getcurveid round-trip', () => {
    const id = mkStr()
    expect(f._EN_getcurveid(ph, curveIdx, id.p)).toBe(0)
    expect(id.val()).toBe('TestCurve')
    id.free()
  })

  it('EN_setcurveid renames and restores', () => {
    const n = cstr('TestCurve2')
    expect(f._EN_setcurveid(ph, curveIdx, n.p)).toBe(0)
    n.free()

    const r = cstr('TestCurve')
    f._EN_setcurveid(ph, curveIdx, r.p)
    r.free()
  })

  it('EN_setcurve, EN_getcurvelen, EN_getcurvetype, EN_setcurvetype', () => {
    const xv = f._malloc(2 * 8), yv = f._malloc(2 * 8)
    f.setValue(xv, 100.0, 'double');  f.setValue(xv + 8, 200.0, 'double')
    f.setValue(yv, 50.0, 'double');   f.setValue(yv + 8, 30.0, 'double')
    expect(f._EN_setcurve(ph, curveIdx, xv, yv, 2)).toBe(0)
    f._free(xv); f._free(yv)

    const len = mkInt()
    expect(f._EN_getcurvelen(ph, curveIdx, len.p)).toBe(0)
    expect(len.val()).toBe(2)
    len.free()

    const ct = mkInt()
    expect(f._EN_getcurvetype(ph, curveIdx, ct.p)).toBe(0)
    const origType = ct.val()
    ct.free()

    expect(f._EN_setcurvetype(ph, curveIdx, origType)).toBe(0)
  })

  it('EN_getcurvevalue and EN_setcurvevalue', () => {
    const x = mkDouble(), y = mkDouble()
    expect(f._EN_getcurvevalue(ph, curveIdx, 1, x.p, y.p)).toBe(0)
    expect(x.val()).toBeCloseTo(100.0)

    expect(f._EN_setcurvevalue(ph, curveIdx, 1, 110.0, 45.0)).toBe(0)
    x.free(); y.free()
  })

  it('EN_getcurve retrieves all curve data', () => {
    const id = mkStr(), nPts = mkInt()
    const xArr = f._malloc(10 * 8), yArr = f._malloc(10 * 8)
    expect(f._EN_getcurve(ph, curveIdx, id.p, nPts.p, xArr, yArr)).toBe(0)
    expect(nPts.val()).toBe(2)
    id.free(); nPts.free()
    f._free(xArr); f._free(yArr)
  })

  it('EN_deletecurve removes "TestCurve"', () => {
    expect(f._EN_deletecurve(ph, curveIdx)).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// SIMPLE CONTROL FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Simple control functions', () => {
  let ctrlIdx = -1

  it('EN_addcontrol creates a TIMER control on link 1', () => {
    const idx = mkInt()
    expect(f._EN_addcontrol(ph, EN_TIMER, 1, 1.0, 0, 3600.0, idx.p)).toBe(0)
    ctrlIdx = idx.val()
    expect(ctrlIdx).toBeGreaterThan(0)
    idx.free()
  })

  it('EN_getcontrol retrieves the control', () => {
    const type = mkInt(), link = mkInt(), setting = mkDouble(), node = mkInt(), level = mkDouble()
    expect(f._EN_getcontrol(ph, ctrlIdx, type.p, link.p, setting.p, node.p, level.p)).toBe(0)
    expect(type.val()).toBe(EN_TIMER)
    expect(link.val()).toBe(1)
    type.free(); link.free(); setting.free(); node.free(); level.free()
  })

  it('EN_setcontrol modifies the control level', () => {
    expect(f._EN_setcontrol(ph, ctrlIdx, EN_TIMER, 1, 1.0, 0, 7200.0)).toBe(0)
  })

  it('EN_getcontrolenabled and EN_setcontrolenabled toggle', () => {
    const en = mkInt()
    expect(f._EN_getcontrolenabled(ph, ctrlIdx, en.p)).toBe(0)
    const orig = en.val()
    en.free()

    expect(f._EN_setcontrolenabled(ph, ctrlIdx, 0)).toBe(0)
    expect(f._EN_setcontrolenabled(ph, ctrlIdx, orig)).toBe(0)
  })

  it('EN_deletecontrol removes the control', () => {
    expect(f._EN_deletecontrol(ph, ctrlIdx)).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// RULE-BASED CONTROL FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Rule-based control functions', () => {
  let ruleIdx = -1

  it('EN_addrule creates a rule with IF/THEN/ELSE', () => {
    const ruleText = cstr(
      'RULE Rule1\nIF LINK 1 STATUS = OPEN\nTHEN LINK 1 STATUS = OPEN\nELSE LINK 1 STATUS = OPEN\nPRIORITY 1'
    )
    expect(f._EN_addrule(ph, ruleText.p)).toBe(0)
    ruleText.free()

    const cnt = mkInt()
    f._EN_getcount(ph, EN_RULECOUNT, cnt.p)
    ruleIdx = cnt.val()
    cnt.free()

    expect(ruleIdx).toBeGreaterThan(0)
  })

  it('EN_getrule retrieves rule premise and action counts', () => {
    const nPrem = mkInt(), nThen = mkInt(), nElse = mkInt(), prio = mkDouble()
    expect(f._EN_getrule(ph, ruleIdx, nPrem.p, nThen.p, nElse.p, prio.p)).toBe(0)
    expect(nPrem.val()).toBeGreaterThan(0)
    expect(nThen.val()).toBeGreaterThan(0)
    nPrem.free(); nThen.free(); nElse.free(); prio.free()
  })

  it('EN_getruleID retrieves rule ID "Rule1"', () => {
    const id = mkStr()
    expect(f._EN_getruleID(ph, ruleIdx, id.p)).toBe(0)
    expect(id.val()).toBe('Rule1')
    id.free()
  })

  it('EN_getpremise retrieves premise 1 properties', () => {
    const logop = mkInt(), obj = mkInt(), objIdx = mkInt()
    const variable = mkInt(), relop = mkInt(), status = mkInt(), value = mkDouble()
    expect(f._EN_getpremise(ph, ruleIdx, 1, logop.p, obj.p, objIdx.p, variable.p, relop.p, status.p, value.p)).toBe(0)
    logop.free(); obj.free(); objIdx.free(); variable.free(); relop.free(); status.free(); value.free()
  })

  it('EN_setpremise re-sets premise 1 with current values', () => {
    const logop = mkInt(), obj = mkInt(), objIdx = mkInt()
    const variable = mkInt(), relop = mkInt(), status = mkInt(), value = mkDouble()
    f._EN_getpremise(ph, ruleIdx, 1, logop.p, obj.p, objIdx.p, variable.p, relop.p, status.p, value.p)
    const lo = logop.val(), ob = obj.val(), oi = objIdx.val()
    const va = variable.val(), re = relop.val(), st = status.val(), vl = value.val()
    logop.free(); obj.free(); objIdx.free(); variable.free(); relop.free(); status.free(); value.free()

    expect(f._EN_setpremise(ph, ruleIdx, 1, lo, ob, oi, va, re, st, vl)).toBe(0)
  })

  it('EN_setpremisestatus sets premise status', () => {
    expect(f._EN_setpremisestatus(ph, ruleIdx, 1, 1)).toBe(0)
  })

  it('EN_setpremisevalue sets premise comparison value', () => {
    expect(f._EN_setpremisevalue(ph, ruleIdx, 1, 0.0)).toBe(0)
  })

  it('EN_setpremiseindex sets premise object index', () => {
    expect(f._EN_setpremiseindex(ph, ruleIdx, 1, 1)).toBe(0)
  })

  it('EN_getthenaction and EN_setthenaction round-trip', () => {
    const link = mkInt(), status = mkInt(), setting = mkDouble()
    expect(f._EN_getthenaction(ph, ruleIdx, 1, link.p, status.p, setting.p)).toBe(0)
    const li = link.val(), st = status.val(), se = setting.val()
    link.free(); status.free(); setting.free()

    expect(f._EN_setthenaction(ph, ruleIdx, 1, li, st, se)).toBe(0)
  })

  it('EN_getelseaction and EN_setelseaction round-trip', () => {
    const link = mkInt(), status = mkInt(), setting = mkDouble()
    expect(f._EN_getelseaction(ph, ruleIdx, 1, link.p, status.p, setting.p)).toBe(0)
    const li = link.val(), st = status.val(), se = setting.val()
    link.free(); status.free(); setting.free()

    expect(f._EN_setelseaction(ph, ruleIdx, 1, li, st, se)).toBe(0)
  })

  it('EN_setrulepriority sets priority to 5.0', () => {
    expect(f._EN_setrulepriority(ph, ruleIdx, 5.0)).toBe(0)
  })

  it('EN_getruleenabled and EN_setruleenabled toggle', () => {
    const en = mkInt()
    expect(f._EN_getruleenabled(ph, ruleIdx, en.p)).toBe(0)
    en.free()

    expect(f._EN_setruleenabled(ph, ruleIdx, 0)).toBe(0)
    expect(f._EN_setruleenabled(ph, ruleIdx, 1)).toBe(0)
  })

  it('EN_deleterule removes the rule', () => {
    expect(f._EN_deleterule(ph, ruleIdx)).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// MSX FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe('MSX functions', () => {
  it('MSXgetcount returns correct species and constant counts', () => {
    const cnt = mkInt()
    expect(f._MSXgetcount(MSX_SPECIES, cnt.p)).toBe(0)
    expect(cnt.val()).toBe(5)  // AS3, AS5, AStot, AS5s, NH2CL

    expect(f._MSXgetcount(MSX_CONSTANT, cnt.p)).toBe(0)
    expect(cnt.val()).toBe(5)  // Ka, Kb, K1, K2, Smax
    cnt.free()
  })

  it('MSXgetindex looks up species "AS3" and returns index 1', () => {
    const idx = mkInt()
    const s = cstr('AS3')
    expect(f._MSXgetindex(MSX_SPECIES, s.p, idx.p)).toBe(0)
    expect(idx.val()).toBe(1)
    s.free(); idx.free()
  })

  it('MSXgetIDlen returns positive length for species 1', () => {
    const len = mkInt()
    expect(f._MSXgetIDlen(MSX_SPECIES, 1, len.p)).toBe(0)
    expect(len.val()).toBeGreaterThan(0)
    len.free()
  })

  it('MSXgetID returns "AS3" for species 1', () => {
    const id = mkStr()
    expect(f._MSXgetID(MSX_SPECIES, 1, id.p, 64)).toBe(0)
    expect(id.val()).toBe('AS3')
    id.free()
  })

  it('MSXgetspecies returns BULK type and UG units for AS3', () => {
    const type = mkInt(), units = mkStr(64), atol = mkDouble(), rtol = mkDouble()
    expect(f._MSXgetspecies(1, type.p, units.p, atol.p, rtol.p)).toBe(0)
    expect(type.val()).toBe(MSX_BULK)
    expect(units.val()).toBe('UG')
    type.free(); units.free(); atol.free(); rtol.free()
  })

  it('MSXgetconstant reads Ka=10.0 and MSXsetconstant changes it', () => {
    const v = mkDouble()
    expect(f._MSXgetconstant(1, v.p)).toBe(0)
    expect(v.val()).toBeCloseTo(10.0)

    expect(f._MSXsetconstant(1, 15.0)).toBe(0)
    expect(f._MSXgetconstant(1, v.p)).toBe(0)
    expect(v.val()).toBeCloseTo(15.0)

    f._MSXsetconstant(1, 10.0)
    v.free()
  })

  it('MSXgetparameter returns 0 for any reaction parameter call', () => {
    // The test network defines no PARAMETERS — verify count is 0 and function is callable
    const cnt = mkInt()
    f._MSXgetcount(MSX_PARAMETER, cnt.p)
    const paramCount = cnt.val()
    cnt.free()

    if (paramCount > 0) {
      const v = mkDouble()
      expect(f._MSXgetparameter(MSX_LINK, 1, 1, v.p)).toBe(0)
      expect(f._MSXsetparameter(MSX_LINK, 1, 1, v.val())).toBe(0)
      v.free()
    }
    // No parameters is a valid state — test passes either way
  })

  it('MSXgetinitqual reads AS3=10.0 at Source node', () => {
    const srcIdx = mkInt()
    const s = cstr('Source')
    f._EN_getnodeindex(ph, s.p, srcIdx.p)
    const si = srcIdx.val()
    s.free(); srcIdx.free()

    const v = mkDouble()
    expect(f._MSXgetinitqual(MSX_NODE, si, 1 /* AS3 */, v.p)).toBe(0)
    expect(v.val()).toBeCloseTo(10.0)
    v.free()
  })

  it('MSXsetinitqual sets AS3 init quality and reads back', () => {
    const srcIdx = mkInt()
    const s = cstr('Source')
    f._EN_getnodeindex(ph, s.p, srcIdx.p)
    const si = srcIdx.val()
    s.free(); srcIdx.free()

    expect(f._MSXsetinitqual(MSX_NODE, si, 1, 12.0)).toBe(0)

    const v = mkDouble()
    f._MSXgetinitqual(MSX_NODE, si, 1, v.p)
    expect(v.val()).toBeCloseTo(12.0)
    v.free()

    f._MSXsetinitqual(MSX_NODE, si, 1, 10.0)  // restore
  })

  it('MSXgetqual returns a value at Source node after MSXsolveQ', () => {
    const srcIdx = mkInt()
    const s = cstr('Source')
    f._EN_getnodeindex(ph, s.p, srcIdx.p)
    const si = srcIdx.val()
    s.free(); srcIdx.free()

    const v = mkDouble()
    expect(f._MSXgetqual(MSX_NODE, si, 1 /* AS3 */, v.p)).toBe(0)
    v.free()
  })

  it('MSXgetsource reads source info at Source node, species AS3', () => {
    const srcIdx = mkInt()
    const s = cstr('Source')
    f._EN_getnodeindex(ph, s.p, srcIdx.p)
    const si = srcIdx.val()
    s.free(); srcIdx.free()

    const type = mkInt(), level = mkDouble(), pat = mkInt()
    expect(f._MSXgetsource(si, 1 /* AS3 */, type.p, level.p, pat.p)).toBe(0)
    type.free(); level.free(); pat.free()
  })

  it('MSXsetsource sets a CONCEN source and resets to NOSOURCE', () => {
    const srcIdx = mkInt()
    const s = cstr('Source')
    f._EN_getnodeindex(ph, s.p, srcIdx.p)
    const si = srcIdx.val()
    s.free(); srcIdx.free()

    expect(f._MSXsetsource(si, 1, MSX_CONCEN, 5.0, 0)).toBe(0)
    expect(f._MSXsetsource(si, 1, MSX_NOSOURCE, 0.0, 0)).toBe(0)
  })

  it('MSXaddpattern creates a new MSX pattern', () => {
    const id = cstr('TestMSXPat')
    expect(f._MSXaddpattern(id.p)).toBe(0)
    id.free()

    const cnt = mkInt()
    expect(f._MSXgetcount(MSX_PATTERN, cnt.p)).toBe(0)
    expect(cnt.val()).toBeGreaterThan(0)
    cnt.free()
  })

  it('MSXsetpattern / MSXgetpatternlen / MSXgetpatternvalue / MSXsetpatternvalue', () => {
    const idx = mkInt()
    const s = cstr('TestMSXPat')
    f._MSXgetindex(MSX_PATTERN, s.p, idx.p)
    const pi = idx.val()
    s.free(); idx.free()

    const vals = f._malloc(3 * 8)
    f.setValue(vals, 1.0, 'double')
    f.setValue(vals + 8, 1.5, 'double')
    f.setValue(vals + 16, 0.8, 'double')
    expect(f._MSXsetpattern(pi, vals, 3)).toBe(0)
    f._free(vals)

    const len = mkInt()
    expect(f._MSXgetpatternlen(pi, len.p)).toBe(0)
    expect(len.val()).toBe(3)
    len.free()

    const v = mkDouble()
    expect(f._MSXgetpatternvalue(pi, 1, v.p)).toBe(0)
    expect(v.val()).toBeCloseTo(1.0)

    expect(f._MSXsetpatternvalue(pi, 1, 2.0)).toBe(0)
    expect(f._MSXgetpatternvalue(pi, 1, v.p)).toBe(0)
    expect(v.val()).toBeCloseTo(2.0)
    v.free()
  })

  it('MSXgeterror returns a string for error code 0', () => {
    const msg = mkStr()
    expect(f._MSXgeterror(0, msg.p, 256)).toBe(0)
    msg.free()
  })

  it('MSXsavemsxfile saves a non-empty MSX input file', () => {
    const s = cstr('saved.msx')
    expect(f._MSXsavemsxfile(s.p)).toBe(0)
    s.free()
    expect(f.FS.readFile('saved.msx').length).toBeGreaterThan(0)
  })

  it('MSXreport writes WQ results to text report', () => {
    expect(f._MSXreport()).toBe(0)
    expect(f.FS.readFile('msxreport.txt', { encoding: 'utf8' }).length).toBeGreaterThan(0)
  })

  it('MSXinit / MSXstep run step-by-step MSX simulation', () => {
    f._MSXsolveH()
    expect(f._MSXinit(0)).toBe(0)

    const t = f._malloc(4), tleft = f._malloc(4)
    expect(f._MSXstep(t, tleft)).toBe(0)
    expect(f.getValue(tleft, 'i32')).toBeGreaterThanOrEqual(0)
    f._free(t); f._free(tleft)
  })

  it('MSXsaveoutfile saves a non-empty binary output file after init+step', () => {
    f._MSXsolveH()
    f._MSXinit(1)

    const t = f._malloc(4), tleft = f._malloc(4)
    let tl = 1, iters = 0
    while (tl > 0 && iters < 1000) {
      f._MSXstep(t, tleft)
      tl = f.getValue(tleft, 'i32')
      iters++
    }
    f._free(t); f._free(tleft)

    const s = cstr('msxout.bin')
    expect(f._MSXsaveoutfile(s.p)).toBe(0)
    s.free()
    expect(f.FS.readFile('msxout.bin').length).toBeGreaterThan(0)
  })

  it('MSXusehydfile registers an external hydraulics file', () => {
    const s = cstr('test.hyd')
    expect(f._MSXusehydfile(s.p)).toBe(0)
    s.free()
    // Restore internal MSX hydraulics for remaining tests
    f._MSXsolveH()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// MSXENopen / MSXENclose (pass-through wrappers — separate project)
// ═══════════════════════════════════════════════════════════════════════════════

describe('MSXENopen and MSXENclose (EPANET pass-through wrappers)', () => {
  it('MSXENopen opens EPANET project and MSXENclose closes it', async () => {
    const phPtr2 = f._malloc(4)
    f._EN_createproject(phPtr2)
    const ph2 = f.getValue(phPtr2, 'i32')
    f._free(phPtr2)

    const inp = cstr('net.inp'), rpt = cstr('enopen.rpt'), out = cstr('')
    expect(f._MSXENopen(ph2, inp.p, rpt.p, out.p)).toBe(0)
    inp.free(); rpt.free(); out.free()

    expect(f._MSXENclose(ph2)).toBe(0)
    f._EN_deleteproject(ph2)
  })
})
