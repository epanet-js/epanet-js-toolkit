import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const inputFile = process.argv[2];
const version = process.argv[3];

if (!inputFile || !version) {
  process.stderr.write('usage: generate-types.js <types-json> <version>\n');
  process.exit(1);
}

const { functions, enums } = JSON.parse(readFileSync(inputFile, 'utf8'));

function mapCType(cType) {
  return cType.trim() === 'void' ? 'void' : 'number';
}

function stripPrefix(name) {
  return name.startsWith('EN_') ? name.slice(3) : name;
}

const outDir = './build/types';
const enumsDir = join(outDir, 'enums');
mkdirSync(enumsDir, { recursive: true });

// --- Enums ---

const enumNames = [];

for (const { name, values } of enums) {
  const shortName = stripPrefix(name);
  const enumDir = join(enumsDir, shortName);
  mkdirSync(enumDir, { recursive: true });

  const lines = [];
  lines.push(`export declare enum ${shortName} {`);
  for (const { name: valName, value, comment } of values) {
    const shortValName = stripPrefix(valName);
    const inlineComment = comment ? ` //!<${comment}` : '';
    lines.push(`  ${shortValName} = ${value},${inlineComment}`);
  }
  lines.push('}');
  lines.push('');

  writeFileSync(join(enumDir, 'index.d.ts'), lines.join('\n'));
  enumNames.push(shortName);
}

// --- EpanetEngine interface ---

function buildJSDoc(fn) {
  const { brief, args, return: ret } = fn;
  const hasDoc = brief || ret || args.some(a => a.comment);
  if (!hasDoc) return null;

  const lines = ['  /**'];
  if (brief) lines.push(`   *${brief}`);
  for (const { name, direction, comment } of args) {
    if (!comment) continue;
    const dir = direction ? ` [${direction}]` : '';
    lines.push(`   * @param ${name}${dir}${comment}`);
  }
  if (ret) lines.push(`   * @returns${ret}`);
  lines.push('   */');
  return lines.join('\n');
}

const interfaceLines = [];
interfaceLines.push('export interface EpanetEngine {');
interfaceLines.push('  _malloc(size: number): number;');
interfaceLines.push('  _free(ptr: number): void;');

for (const fn of functions) {
  interfaceLines.push('');
  const jsdoc = buildJSDoc(fn);
  if (jsdoc) interfaceLines.push(jsdoc);
  const params = fn.args.map(({ name, type }) => `${name}: ${mapCType(type)}`).join(', ');
  interfaceLines.push(`  _${fn.name}(${params}): ${mapCType(fn.returnType)};`);
}

interfaceLines.push('}');

// --- enums/index.ts ---

const enumIndexLines = [];
for (const enumName of enumNames) {
  enumIndexLines.push(`export { ${enumName} } from './${enumName}';`);
}
enumIndexLines.push('');

writeFileSync(join(enumsDir, 'index.d.ts'), enumIndexLines.join('\n'));

// --- index.ts ---

const indexLines = [];
if (enumNames.length > 0) indexLines.push(`export * from './enums';`);
if (enumNames.length > 0) indexLines.push('');
indexLines.push(...interfaceLines);
indexLines.push('');
indexLines.push(`/**`);
indexLines.push(` * Emscripten runtime utilities always present on the loaded module.`);
indexLines.push(` */`);
indexLines.push(`export interface EpanetEngineRuntime {`);
indexLines.push(`  FS: any`);
indexLines.push(`  HEAPF64: Float64Array`);
indexLines.push(`  HEAPF32: Float32Array`);
indexLines.push(`  HEAP32: Int32Array`);
indexLines.push(`  HEAPU32: Uint32Array`);
indexLines.push(`  UTF8ToString(ptr: number, maxBytesToRead?: number): string`);
indexLines.push(`  stringToUTF8(str: string, outPtr: number, maxBytesToWrite: number): void`);
indexLines.push(`  getValue(ptr: number, type: string): number`);
indexLines.push(`  setValue(ptr: number, value: number, type: string): void`);
indexLines.push(`  allocateUTF8(str: string): number`);
indexLines.push(`  ccall(ident: string, returnType: string | null, argTypes: string[], args: any[]): any`);
indexLines.push(`  cwrap(ident: string, returnType: string | null, argTypes: string[]): (...args: any[]) => any`);
indexLines.push(`}`);
indexLines.push(``);
indexLines.push(`export interface EpanetEngineAPI extends EpanetEngine, EpanetEngineRuntime {}`);
indexLines.push(``);
indexLines.push(`declare function EpanetEngineFactory(moduleArg?: object): Promise<EpanetEngineAPI>;`);
indexLines.push(`export default EpanetEngineFactory;`);
indexLines.push('');

writeFileSync(join(outDir, 'index.d.ts'), indexLines.join('\n'));
