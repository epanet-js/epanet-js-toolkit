#!/bin/bash
# Generates the EXPORTED_FUNCTIONS JSON array for Emscripten linker flags.
#
# Usage:
#   ./generate_exports.sh              # EPANET functions only
#   ./generate_exports.sh enable_msx   # EPANET + MSX functions
#
# Requires: clang, jq, python3
# Run from the repository root after build/ has been populated by build.sh.

set -eo pipefail

for cmd in clang jq python3; do
    if ! command -v "$cmd" &>/dev/null; then
        echo "error: required command not found: $cmd" >&2
        exit 1
    fi
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EPANET_HEADER="${SCRIPT_DIR}/build/EPANET/include/epanet2_2.h"
MSX_HEADER="${SCRIPT_DIR}/build/EPANETMSX/src/solver/include/epanetmsx.h"

WORK_DIR="${SCRIPT_DIR}/build"

check_header() {
    if [ ! -f "$1" ]; then
        echo "error: header not found: $1" >&2
        echo "       run build.sh first to clone the repositories" >&2
        exit 1
    fi
}

extract_functions() {
    local header="$1"
    local name
    name="$(basename "$header")"
    local dir="$WORK_DIR/$(echo "$name" | tr '.' '_')"
    mkdir -p "$dir"

    # Step 1: write a translation unit that includes the header and run it
    # through the preprocessor to produce a fully macro-expanded source file.
    printf '#include "%s"\n' "$header" > "$dir/syms.c"
    clang -E -x c "$dir/syms.c" -o "$dir/syms_pp.c" 2>/dev/null

    # Step 2: generate the AST JSON from the preprocessed source.
    # The preprocessed file retains # line markers, so loc.file in the AST
    # still references the original header and loc.offset is a byte offset
    # into that original file.
    clang -x c -w -fsyntax-only \
          -Xclang -ast-dump=json \
          "$dir/syms_pp.c" \
          > "$dir/syms_ast.json" 2>/dev/null || true

    # Steps 3 & 4: recursively walk the AST, carry loc.file forward (it is only
    # emitted when the source file changes), collect every FunctionDecl that
    # originates from the target header, and extract its name from syms_pp.c
    # using the offset + tokLen fields.
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
    python3 "$dir/extract.py" "$dir/syms_ast.json" "$dir/syms_pp.c" "$name"
}

check_header "$EPANET_HEADER"
functions=$(extract_functions "$EPANET_HEADER")

if [ "${1:-}" = "enable_msx" ]; then
    check_header "$MSX_HEADER"
    msx_functions=$(extract_functions "$MSX_HEADER")
    functions=$(jq -n --argjson a "$functions" --argjson b "$msx_functions" '$a + $b')
fi

# Prefix each symbol with _ (Emscripten C-symbol convention) and append the
# required runtime allocator symbols.
jq -n --argjson fns "$functions" \
   '($fns | map("_" + .)) + ["_malloc", "_free"]'
