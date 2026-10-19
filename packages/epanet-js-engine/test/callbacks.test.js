import { it, expect, describe, beforeAll, afterAll } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = process.env.EPANET_ENGINE_DIST ?? join(__dirname, '../dist')

const VERSIONS = [
  'v2.2',
  'v2.3',
  'v2.3.1',
  'v2.3.2',
  'v2.3.3',
  'v2.3.4',
  'v2.3.5',
  'v2.3.5-lsx',
  'master',
  'dev',
].filter((version) => existsSync(join(DIST, version, 'index.js')))

// Emscripten addFunction signatures: return type first, then one letter per parameter
const PROGRESS_CALLBACK_SIGNATURE = 'vi' // void (*)(char *message)
const REPORT_CALLBACK_SIGNATURE = 'viii' // void (*)(void *userData, void *ph, const char *line)

const MISSING_CALLBACK_SUPPORT =
  'Engine must be linked with -s ALLOW_TABLE_GROWTH=1 and export addFunction/removeFunction. ' +
  'Rebuild the engine package.'

describe.each(VERSIONS)('EPANET %s callbacks', (version) => {
  let f, ph
  const cstr = (s) => f.allocateUTF8(s)

  beforeAll(async () => {
    const dir = join(DIST, version)
    const { default: factory } = await import(pathToFileURL(join(dir, 'index.js')).href)
    const wasmPath = join(dir, 'EpanetEngine.wasm')
    f = await factory(existsSync(wasmPath) ? { wasmBinary: readFileSync(wasmPath) } : {})
    f.FS.writeFile('net.inp', readFileSync(join(__dirname, 'network.inp')))

    const phPtr = f._malloc(4)
    f._EN_createproject(phPtr)
    ph = f.getValue(phPtr, 'i32')
    f._free(phPtr)
  })

  afterAll(() => {
    f._EN_deleteproject(ph)
  })

  it('exposes addFunction/removeFunction', () => {
    expect(f.addFunction, MISSING_CALLBACK_SUPPORT).toBeTypeOf('function')
    expect(f.removeFunction, MISSING_CALLBACK_SUPPORT).toBeTypeOf('function')
  })

  it('EN_runproject calls pviewprog with progress messages', () => {
    const messages = []
    const onProgress = f.addFunction((msgPtr) => messages.push(f.UTF8ToString(msgPtr)), PROGRESS_CALLBACK_SIGNATURE)

    const err = f._EN_runproject(ph, cstr('net.inp'), cstr('run.rpt'), cstr('run.out'), onProgress)

    expect(err).toBe(0)
    expect(messages.some((m) => /Computing hydraulics/.test(m))).toBe(true)
    expect(messages.some((m) => /Writing output report/.test(m))).toBe(true)
  })

  const itReportCallback = (name, fn) =>
    it(name, (ctx) => (typeof f._EN_setreportcallback === 'function' ? fn() : ctx.skip()))

  itReportCallback('EN_setreportcallback receives report lines with userData and project handle', () => {
    const calls = []
    const onLine = f.addFunction((userData, project, linePtr) => {
      calls.push({ userData, project, line: f.UTF8ToString(linePtr) })
    }, REPORT_CALLBACK_SIGNATURE)
    const userData = f._malloc(4)

    expect(f._EN_open(ph, cstr('net.inp'), cstr('net.rpt'), cstr('net.out'))).toBe(0)
    expect(f._EN_setreportcallback(ph, onLine)).toBe(0)
    f._EN_writeline(ph, cstr('without user data'))
    expect(f._EN_setreportcallbackuserdata(ph, userData)).toBe(0)
    f._EN_writeline(ph, cstr('with user data'))

    expect(calls).toEqual([
      { userData: 0, project: ph, line: 'without user data' },
      { userData, project: ph, line: 'with user data' },
    ])

    expect(f._EN_setreportcallback(ph, 0)).toBe(0)
    f._EN_writeline(ph, cstr('to the file'))
    expect(f._EN_close(ph)).toBe(0)
    f.removeFunction(onLine)
    f._free(userData)

    expect(calls).toHaveLength(2)
    const rpt = f.FS.readFile('net.rpt', { encoding: 'utf8' })
    expect(rpt).toContain('to the file')
    expect(rpt).not.toContain('with user data')
  })
})
