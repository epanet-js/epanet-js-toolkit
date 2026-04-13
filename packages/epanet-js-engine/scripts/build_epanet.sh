#!/bin/bash

# Build script for EPANET and EPANETMSX with Emscripten
# This script clones the repositories, applies necessary patches, and builds with emcmake
#
# Usage:
#   ./build.sh [--enable_msx] [--epanet-tag=<tag>] [--debug]

set -e  # Exit on any error

# Configuration
EPANET_TAG="${EPANET_TAG:-v2.3.5}"
ENABLE_MSX=0
SINGLE_FILE=0
BUILD_TYPE="Release"
for arg in "$@"; do
    case "$arg" in
        --enable_msx)      ENABLE_MSX=1 ;;
        --epanet-tag=*)    EPANET_TAG="${arg#--epanet-tag=}" ;;
        --debug)           BUILD_TYPE="Debug" ;;
        --single-file)     SINGLE_FILE=1
    esac
done

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=========================================="
echo "EPANET + EPANETMSX Emscripten Build Script"
echo "=========================================="
echo "EPANET Tag: ${EPANET_TAG}"
echo "Enable MSX: ${ENABLE_MSX}"
echo "Build Type: ${BUILD_TYPE}"
echo ""

# Step 1: Create build directory
echo "[1/7] Creating build directory..."
if [ -d "build" ]; then
    echo "  -> Build directory already exists, removing..."
    rm -rf build
fi
mkdir build
cd build
echo "  -> Done."

# Step 2: Clone EPANET repository
echo "[2/7] Cloning EPANET repository (tag: ${EPANET_TAG})..."
git clone --branch "${EPANET_TAG}" --depth 1 https://github.com/OpenWaterAnalytics/EPANET EPANET
echo "  -> Done."

# Step 3: Clone EPANETMSX repository
echo "[3/7] Cloning EPANETMSX repository..."
git clone --depth 1 https://github.com/USEPA/EPANETMSX EPANETMSX
echo "  -> Done."

# Step 4: Apply patches
echo "[4/7] Applying EPANET patches..."
PATCHES_DIR="${PROJECT_DIR}/patches/epanet"
for patch in "${PATCHES_DIR}"/*.patch; do
    echo "  -> Applying $(basename ${patch})..."
    git -C EPANET apply --whitespace=fix "${patch}"
    git -C EPANET add .
    git -C EPANET commit -m "epanet-js patch ${patch}"
done

PATCHES_DIR="${PROJECT_DIR}/patches/msx"
for patch in "${PATCHES_DIR}"/*.patch; do
    echo "  -> Applying $(basename ${patch})..."
    git -C EPANETMSX apply --whitespace=fix "${patch}"
    git -C EPANETMSX add .
    git -C EPANETMSX commit -m "epanet-js patch ${patch}"
done
echo "  -> Done."

# Step 5: Generate Emscripten exports
echo "[5/7] Generating exports..."
GENERATE_EXPORTS="${PROJECT_DIR}/scripts/generate_exports.sh"

epanet_exports=$(bash "$GENERATE_EXPORTS" EPANET/include/epanet2_2.h)
echo "  -> EPANET exports generated."

if [ "$ENABLE_MSX" = "1" ]; then
    msx_exports=$(bash "$GENERATE_EXPORTS" EPANETMSX/src/solver/include/epanetmsx.h EPANET/include)
    echo "  -> MSX exports generated."
    exports=$(jq -n --argjson a "$epanet_exports" --argjson b "$msx_exports" '$a + $b | unique')
else
    exports="$epanet_exports"
fi

echo "$exports" > exports.json
echo "  -> Done."

# Step 6: Build with Emscripten
echo "[6/7] Building with Emscripten..."
CMAKE_ARGS="-DCMAKE_BUILD_TYPE=${BUILD_TYPE}"
[ "$ENABLE_MSX" = "1" ] && CMAKE_ARGS="${CMAKE_ARGS} -DINCLUDE_MSX=1"
[ "$SINGLE_FILE" = "1" ] && CMAKE_ARGS="${CMAKE_ARGS} -DSINGLE_FILE=1"
echo "  -> Running emcmake cmake .."
emcmake cmake $CMAKE_ARGS ..
echo "  -> Running make -j8"
make -j8
cd ..

# Step 7: Generate TypeScript types
echo "[7/7] Generating TypeScript types..."
TYPE_VERSION="${EPANET_TAG}"
[ "$ENABLE_MSX" = "1" ] && TYPE_VERSION="${EPANET_TAG}-msx"

node "${PROJECT_DIR}/scripts/parse-types-ast.js" \
    "${PROJECT_DIR}/build/ast/syms_ast.json" \
    > "${PROJECT_DIR}/build/parsed-ast.json"
echo "  -> AST parsed."

node "${PROJECT_DIR}/scripts/generate-types.js" \
    "${PROJECT_DIR}/build/parsed-ast.json" \
    "${TYPE_VERSION}"
echo "  -> Done."

echo ""
echo "=========================================="
echo "Build completed successfully!"
echo "=========================================="
