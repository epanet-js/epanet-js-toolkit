#!/bin/bash

# Build script for EPANET and EPANETMSX with Emscripten
# This script clones the repositories, applies necessary patches, and builds with emcmake
#
# Usage:
#   ./build.sh [enable_msx] [--epanet-tag=<tag>]

set -e  # Exit on any error

# Configuration
EPANET_TAG="${EPANET_TAG:-v2.3.5}"
ENABLE_MSX=0
for arg in "$@"; do
    case "$arg" in
        enable_msx)        ENABLE_MSX=1 ;;
        --epanet-tag=*)    EPANET_TAG="${arg#--epanet-tag=}" ;;
    esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "EPANET + EPANETMSX Emscripten Build Script"
echo "=========================================="
echo "EPANET Tag: ${EPANET_TAG}"
echo "Enable MSX: ${ENABLE_MSX}"
echo ""

# Step 1: Create build directory
echo "[1/6] Creating build directory..."
if [ -d "build" ]; then
    echo "  -> Build directory already exists, removing..."
    rm -rf build
fi
mkdir build
cd build
echo "  -> Done."

# Step 2: Clone EPANET repository
echo "[2/6] Cloning EPANET repository (tag: ${EPANET_TAG})..."
git clone --branch "${EPANET_TAG}" --depth 1 https://github.com/OpenWaterAnalytics/EPANET EPANET
echo "  -> Done."

# Step 3: Clone EPANETMSX repository
echo "[3/6] Cloning EPANETMSX repository..."
git clone --depth 1 https://github.com/USEPA/EPANETMSX EPANETMSX
echo "  -> Done."

# Step 4: Apply patches
echo "[4/6] Applying patches..."
PATCHES_DIR="${SCRIPT_DIR}/patches"
for patch in "${PATCHES_DIR}"/*.patch; do
    echo "  -> Applying $(basename ${patch})..."
    git -C EPANETMSX apply --whitespace=fix "${patch}"
done
echo "  -> Done."

# Step 5: Generate Emscripten exports
echo "[5/6] Generating exports..."
GENERATE_EXPORTS="${SCRIPT_DIR}/generate_exports.sh"

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
echo "[6/6] Building with Emscripten..."
CMAKE_ARGS=""
[ "$ENABLE_MSX" = "1" ] && CMAKE_ARGS="-DINCLUDE_MSX=1"
echo "  -> Running emcmake cmake .."
emcmake cmake $CMAKE_ARGS ..
echo "  -> Running make -j8"
make -j8
cd ..

echo ""
echo "=========================================="
echo "Build completed successfully!"
echo "=========================================="
