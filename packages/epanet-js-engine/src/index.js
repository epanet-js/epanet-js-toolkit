/**
 * Initialises an EpanetEngine WASM module and returns a proxy that exposes
 * every exported C function under its unprefixed name, alongside the
 * Emscripten runtime utilities (FS, UTF8ToString, allocateUTF8, …).
 *
 * Emscripten exports C symbols with a leading underscore (_EN_open, _MSXclose,
 * …). The proxy transparently maps the unprefixed name to the underscored one,
 * so both spellings work:
 *
 *   f.EN_open(...)   // resolved to module._EN_open(...)
 *   f._EN_open(...)  // also works
 *
 * @param {() => Promise<object>} factory  Default export of a versioned
 *   sub-path, e.g. `import factory from "epanet-engine/v2.3-msx"`
 * @returns {Promise<object>}
 */
export async function loader(factory) {
  const module = await factory()

  return new Proxy(module, {
    get(target, prop) {
      if (typeof prop !== 'string') return target[prop]
      if (prop in target) return target[prop]
      const prefixed = `_${prop}`
      if (prefixed in target) return target[prefixed]
      return undefined
    }
  })
}
