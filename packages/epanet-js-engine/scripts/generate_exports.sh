#!/bin/bash
# Generates the EXPORTED_FUNCTIONS JSON array for Emscripten linker flags
# by parsing the exported functions from a C header file.
#
# Usage:
#   ./generate_exports.sh <header> [include_dir]
#
# Requires: clang, jq, node

set -eo pipefail

if [ $# -lt 1 ] || [ $# -gt 2 ]; then
    echo "usage: $(basename "$0") <header> [include_dir]" >&2
    exit 1
fi

for cmd in clang jq node; do
    if ! command -v "$cmd" &>/dev/null; then
        echo "error: required command not found: $cmd" >&2
        exit 1
    fi
done

HEADER="$(realpath "$1")"
INCLUDE_FLAG=""
if [ $# -eq 2 ]; then
    INCLUDE_FLAG="-I$(realpath "$2")"
fi

if [ ! -f "$HEADER" ]; then
    echo "error: header not found: $HEADER" >&2
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK_DIR="${SCRIPT_DIR}/build"

name="$(basename "$HEADER")"
dir="$WORK_DIR/$(echo "$name" | tr '.' '_')"
mkdir -p "$dir"

# Step 1: write a translation unit that includes the header and run it
# through the preprocessor to produce a fully macro-expanded source file.
printf '#include "%s"\n' "$HEADER" > "$dir/syms.c"
clang -E -C -x c ${INCLUDE_FLAG:+"$INCLUDE_FLAG"} "$dir/syms.c" -o "$dir/syms_pp.c"

# Step 2: generate the AST JSON from the preprocessed source.
clang -x c -w -fsyntax-only \
      -Xclang -ast-dump=json \
      "$dir/syms_pp.c" \
      > "$dir/syms_ast.json" 2>/dev/null || true

# Steps 3 & 4: recursively walk the AST, collect every FunctionDecl, and
# extract its name from syms_pp.c using the offset + tokLen fields.
cat > "$dir/extract.js" << 'JSEOF'
import * as fs from "fs";
const [,, astFile, ppFile] = process.argv;

const src = fs.readFileSync(ppFile);
const ast = JSON.parse(fs.readFileSync(astFile, 'utf8'));
const results = [];

function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (node.kind === 'FunctionDecl') {
        const { offset, tokLen } = node.loc || {};
        if (offset != null && tokLen != null) {
            results.push(src.slice(offset, offset + tokLen).toString());
        }
    }
    for (const child of node.inner || []) {
        walk(child);
    }
}

walk(ast);
console.log(JSON.stringify(results));
JSEOF

functions=$(node "$dir/extract.js" "$dir/syms_ast.json" "$dir/syms_pp.c")

# Prefix each symbol with _ (Emscripten C-symbol convention) and append the
# required runtime allocator symbols.
jq -n --argjson fns "$functions" \
   '($fns | map("_" + .)) + ["_malloc", "_free"]'
