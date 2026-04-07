#!/bin/bash
# Builds EPANET WASM artifacts for all versions in the matrix,
# producing both an EPANET-only and an EPANET+MSX variant for each.
#
# Output layout:
#   lib/<version>/EpanetEngine.{js,wasm}        EPANET only
#   lib/<version>/msx/EpanetEngine.{js,wasm}    EPANET + MSX

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_EPANET="${SCRIPT_DIR}/build_epanet.sh"

VERSIONS=(
    v2.2
    v2.3
    v2.3.1
    v2.3.2
    v2.3.3
    v2.3.4
    v2.3.5
    master
    dev
)

for version in "${VERSIONS[@]}"; do
    echo ""
    echo "=========================================="
    echo "Building EPANET ${version}"
    echo "=========================================="

    mkdir -p "${SCRIPT_DIR}/lib/${version}"
    mkdir -p "${SCRIPT_DIR}/lib/${version}-msx"

    echo "[1/2] EPANET only..."
    bash "$BUILD_EPANET" "--epanet-tag=${version}"
    cp "${SCRIPT_DIR}/build/EpanetEngine.js"   "${SCRIPT_DIR}/lib/${version}/"
    cp "${SCRIPT_DIR}/build/EpanetEngine.wasm" "${SCRIPT_DIR}/lib/${version}/"

    echo "[2/2] EPANET + MSX..."
    bash "$BUILD_EPANET" "--epanet-tag=${version}" enable_msx
    cp "${SCRIPT_DIR}/build/EpanetEngine.js"   "${SCRIPT_DIR}/lib/${version}-msx/"
    cp "${SCRIPT_DIR}/build/EpanetEngine.wasm" "${SCRIPT_DIR}/lib/${version}-msx/"

    echo "  -> ${version} done."
done

echo ""
echo "=========================================="
echo "All versions built successfully!"
echo "=========================================="
