#!/bin/bash
# Builds EPANET WASM artifacts for all versions in the matrix,
# producing both an EPANET-only and an EPANET+MSX variant for each.
#
# Output layout:
#   dist/<version>/EpanetEngine.wasm , index.js , index.d.ts        EPANET only
#   dist/<version>-msx/EpanetEngine.wasm , index.js , index.d.ts    EPANET + MSX
#   dist/index.js , index.d.ts                                      EPANET + MSX (latest) as single-file JS bundle

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOºURCE[0]}")" && pwd)"
BUILD_EPANET="${PROJECT_DIR}/scripts/build_epanet.sh"

LTS_VERSION="v2.3.5"
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

function copyFiles() {
    local version=$1

    cp "${PROJECT_DIR}/build/EpanetEngine.js"   "${PROJECT_DIR}/dist/${version}/index.js"
    [ -f "${PROJECT_DIR}/build/EpanetEngine.wasm" ] && cp "${PROJECT_DIR}/build/EpanetEngine.wasm" "${PROJECT_DIR}/dist/${version}/"
    cp -r ${PROJECT_DIR}/build/types/* "${PROJECT_DIR}/dist/${version}/"
}

for version in "${VERSIONS[@]}"; do
    echo ""
    echo "=========================================="
    echo "Building EPANET ${version}"
    echo "=========================================="

    mkdir -p "${PROJECT_DIR}/dist/${version}"
    mkdir -p "${PROJECT_DIR}/dist/${version}-msx"

    echo "[1/2] EPANET..."
    bash "$BUILD_EPANET" "--epanet-tag=${version}"
    copyFiles "$version"

    echo "[2/2] EPANET + MSX..."
    bash "$BUILD_EPANET" "--epanet-tag=${version}" --enable_msx
    copyFiles "${version}-msx"

    echo "  -> ${version} done."
done

echo ""
echo "======================================================="
echo "Building EPANET+MSX LTS (${LTS_VERSION}) as single-file"
echo "======================================================="

bash "$BUILD_EPANET" "--epanet-tag=${LTS_VERSION}" --enable_msx --single-file
cp "${PROJECT_DIR}/build/EpanetEngine.js"   "${PROJECT_DIR}/dist/index.js"
cp -r ${PROJECT_DIR}/build/types/* "${PROJECT_DIR}/dist"

echo "  -> LTS (${LTS_VERSION}) done."

echo ""
echo "=========================================="
echo "All versions built successfully!"
echo "=========================================="
