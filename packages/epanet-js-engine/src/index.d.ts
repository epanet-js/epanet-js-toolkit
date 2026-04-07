/**
 * Emscripten runtime utilities always present on the loaded module.
 */
export interface EpanetEngineRuntime {
  FS: any
  UTF8ToString(ptr: number, maxBytesToRead?: number): string
  stringToUTF8(str: string, outPtr: number, maxBytesToWrite: number): void
  getValue(ptr: number, type: string): number
  setValue(ptr: number, value: number, type: string): void
  allocateUTF8(str: string): number
  ccall(ident: string, returnType: string | null, argTypes: string[], args: any[]): any
  cwrap(ident: string, returnType: string | null, argTypes: string[]): (...args: any[]) => any
  malloc(size: number): number
  free(ptr: number): void
}

/**
 * The object returned by `loader()`. Every exported C symbol is accessible
 * both with and without its leading underscore, alongside the Emscripten
 * runtime utilities above.
 */
export type EpanetEngineApi = EpanetEngineRuntime & {
  [fn: string]: any
}

/**
 * The default export type of every versioned sub-path
 * (e.g. `import factory from "epanet-engine/v2.3-msx"`).
 */
export type EpanetEngineFactory = () => Promise<object>

/**
 * Initialises an EpanetEngine WASM module and returns an object with all
 * exported C functions as named properties (underscore prefix optional).
 *
 * @example
 * import { loader } from "epanet-engine"
 * import factory from "epanet-engine/v2.3-msx"
 *
 * const f = await loader(factory)
 * const ptr = f.allocateUTF8("network.inp")
 * f.EN_open(proj, ptr, 0, 0)
 * f.free(ptr)
 */
export function loader(factory: EpanetEngineFactory): Promise<EpanetEngineApi>
