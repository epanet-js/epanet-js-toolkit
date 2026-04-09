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
mkdirSync(outDir, { recursive: true });

// --- Enums ---

const enumNames = [];

for (const { name, values } of enums) {
  const shortName = stripPrefix(name);
  const enumDir = join(outDir, shortName);
  mkdirSync(enumDir, { recursive: true });

  const lines = [];
  lines.push(`export enum ${shortName} {`);
  for (const { name: valName, value, comment } of values) {
    const shortValName = stripPrefix(valName);
    const inlineComment = comment ? ` //!<${comment}` : '';
    lines.push(`  ${shortValName} = ${value},${inlineComment}`);
  }
  lines.push('}');
  lines.push('');

  writeFileSync(join(enumDir, 'index.ts'), lines.join('\n'));
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
interfaceLines.push('  malloc(size: number): number;');
interfaceLines.push('  free(ptr: number): void;');

for (const fn of functions) {
  interfaceLines.push('');
  const jsdoc = buildJSDoc(fn);
  if (jsdoc) interfaceLines.push(jsdoc);
  const params = fn.args.map(({ name, type }) => `${name}: ${mapCType(type)}`).join(', ');
  interfaceLines.push(`  ${fn.name}(${params}): ${mapCType(fn.returnType)};`);
}

interfaceLines.push('}');

// --- index.ts ---

const indexLines = [];
for (const enumName of enumNames) {
  indexLines.push(`export { ${enumName} } from './${enumName}';`);
}
if (enumNames.length > 0) indexLines.push('');
indexLines.push(...interfaceLines);
indexLines.push('');

writeFileSync(join(outDir, 'index.ts'), indexLines.join('\n'));
