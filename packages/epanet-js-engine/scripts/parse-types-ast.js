import { readFileSync } from "fs";

const astFile = process.argv[2];
if (!astFile) {
  process.stderr.write('usage: parse-types-ast.js <ast-json>\n');
  process.exit(1);
}
const ast = JSON.parse(readFileSync(astFile, 'utf8'));

function walk(node, cb) {
  cb(node);
  (node.inner ?? []).forEach((child) => walk(child, cb));
}

const functions = [];
const enums = [];

function parseFunctionArg(node, args) {
  args.push({
    name: node.name,
    type: node.type.qualType
  })
}

function parseFunctionComment(node, args, extra) {
  let commentNodes = [];
  let blockCommandNodes = [];

  walk(node, (n) => {
    if (n.kind === 'ParamCommandComment') {
      commentNodes.push({
        node: n,
        param: n.param,
        direction: n.direction,
        comment: ''
      });
    }

    if (n.kind === 'BlockCommandComment') {
      blockCommandNodes.push({
        node: n,
        name: n.name
      });
    }
  });

  blockCommandNodes.forEach(commandNode => {
    let text = '';

    walk(commandNode.node, (n) => {
      if (text.length > 0) return;
      if (n.kind === 'TextComment') {
        text = n.text;
      }
    });

    extra[commandNode.name] = text;
  });

  commentNodes.forEach(commentNode => {
    walk(commentNode.node, n => {
      if (commentNode.comment.length > 0) return;
      if (n.kind === 'TextComment') {
        commentNode.comment = n.text;
      }
    });
  });

  if (commentNodes.length === 0) return;

  args.forEach((arg, i) => {
    const { direction, comment } = commentNodes.find(n => n.param === arg.name);
    args[i] = { ...arg, direction, comment };
  });
}

function parseFunction(node) {
  const name = node.name;
  const returnType = node.type.qualType.split('(')[0].trim();
  const args = [];
  const extra = {}

  node.inner
    ?.filter(n => n.kind === 'ParmVarDecl')
    .forEach(n => parseFunctionArg(n, args));

  node.inner
    ?.filter(n => n.kind === 'FullComment')
    .forEach(n => parseFunctionComment(n, args, extra))

  functions.push({ name, returnType, args, ...extra });
}

function parseEnumConstant(node) {
  const name = node.name;
  const type = node.type.qualType;
  const value = node.inner
    .filter(n => n.kind === 'ConstantExpr')[0]
    .value;
  const comment = node.inner
    .filter(n => n.kind === 'FullComment')[0]
    ?.inner[0]?.inner[0]?.text;

  return { name, type, value, comment };
}

function parseTypedef(node) {
  const name = node.name;
  const ownerId = node.inner[0].ownedTagDecl?.id;
  let originalNode = undefined;

  walk(ast, (node) => {
    if (node.id === ownerId) {
      originalNode = node;
    }
  });

  if (!originalNode) return;

  if (originalNode.kind === 'EnumDecl') {
    const values = originalNode.inner
      .filter(node => node.kind === 'EnumConstantDecl')
      .map(parseEnumConstant)
    enums.push({ name, values })
  }
}

const handlers = {
  'FunctionDecl': parseFunction,
  'TypedefDecl': parseTypedef
};

function processNode(node) {
  if (!handlers[node.kind]) return;
  handlers[node.kind](node);
}

walk(ast, processNode);

const output = { functions, enums };
console.log(JSON.stringify(output, null, 2));