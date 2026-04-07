#!/bin/bash

# Build script for EPANET and EPANETMSX with Emscripten
# This script clones the repositories, applies necessary patches, and builds with emcmake

set -e  # Exit on any error

# Configuration
EPANET_TAG="${EPANET_TAG:-v2.3.5}"

echo "=========================================="
echo "EPANET + EPANETMSX Emscripten Build Script"
echo "=========================================="
echo "EPANET Tag: ${EPANET_TAG}"
echo ""

# Step 1: Create build directory
echo "[1/5] Creating build directory..."
if [ -d "build" ]; then
    echo "  -> Build directory already exists, removing..."
    rm -rf build
fi
mkdir build
cd build
echo "  -> Done."

# Step 1: Clone EPANET repository
echo "[2/5] Cloning EPANET repository (tag: ${EPANET_TAG})..."
if [ -d "EPANET" ]; then
    echo "  -> EPANET directory already exists, removing..."
    rm -rf EPANET
fi
git clone --branch "${EPANET_TAG}" --depth 1 https://github.com/OpenWaterAnalytics/EPANET EPANET
echo "  -> Done."

# Step 3: Clone EPANETMSX repository
echo "[3/5] Cloning EPANETMSX repository..."
if [ -d "EPANETMSX" ]; then
    echo "  -> EPANETMSX directory already exists, removing..."
    rm -rf EPANETMSX
fi
git clone --depth 1 https://github.com/USEPA/EPANETMSX EPANETMSX
echo "  -> Done."

# Step 4: Apply patches
echo "[4/5] Applying patches..."
PATCHES_DIR="$(cd .. && pwd)/patches"
for patch in "${PATCHES_DIR}"/*.patch; do
    echo "  -> Applying $(basename ${patch})..."
    git -C EPANETMSX apply "${patch}"
done

# Step 5: Build with Emscripten
echo "[5/5] Building with Emscripten..."
echo "  -> Running emcmake cmake .."
emcmake cmake ..
echo "  -> Running make -j8"
make -j8
cd ..

echo ""
echo "=========================================="
echo "Build completed successfully!"
echo "=========================================="
