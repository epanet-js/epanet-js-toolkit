#!/bin/bash
# Generates the EXPORTED_FUNCTIONS JSON array for Emscripten linker flags
# by parsing the exported functions from a C header file.
#
# Usage:
#   ./generate_exports.sh <header> [include_dir]
#
# Requires: clang, jq, python3

set -eo pipefail

if [ $# -lt 1 ] || [ $# -gt 2 ]; then
    echo "usage: $(basename "$0") <header> [include_dir]" >&2
    exit 1
fi

for cmd in clang jq python3; do
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

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK_DIR="${SCRIPT_DIR}/build"

name="$(basename "$HEADER")"
dir="$WORK_DIR/$(echo "$name" | tr '.' '_')"
mkdir -p "$dir"

# Step 1: write a translation unit that includes the header and run it
# through the preprocessor to produce a fully macro-expanded source file.
printf '#include "%s"\n' "$HEADER" > "$dir/syms.c"
clang -E -x c ${INCLUDE_FLAG:+"$INCLUDE_FLAG"} "$dir/syms.c" -o "$dir/syms_pp.c"

# Step 2: generate the AST JSON from the preprocessed source.
clang -x c -w -fsyntax-only \
      -Xclang -ast-dump=json \
      "$dir/syms_pp.c" \
      > "$dir/syms_ast.json" 2>/dev/null || true

# Steps 3 & 4: recursively walk the AST, collect every FunctionDecl, and
# extract its name from syms_pp.c using the offset + tokLen fields.
cat > "$dir/extract.py" << 'PYEOF'
import sys, json

def walk(node, header, src, results):
    if not isinstance(node, dict):
        return
    loc = node.get('loc', {})
    if node.get('kind') == 'FunctionDecl':
        offset, toklen = loc.get('offset'), loc.get('tokLen')
        if offset is not None and toklen is not None:
            results.append(src[offset:offset + toklen].decode())
    for child in node.get('inner', []):
        walk(child, header, src, results)

ast_file, pp_file, header_name = sys.argv[1], sys.argv[2], sys.argv[3]
src = open(pp_file, 'rb').read()
results = []
ast = json.load(open(ast_file))
walk(ast, header_name, src, results)
print(json.dumps(results))
PYEOF

functions=$(python3 "$dir/extract.py" "$dir/syms_ast.json" "$dir/syms_pp.c" "$name")

# Prefix each symbol with _ (Emscripten C-symbol convention) and append the
# required runtime allocator symbols.
jq -n --argjson fns "$functions" \
   '($fns | map("_" + .)) + ["_malloc", "_free"]'
