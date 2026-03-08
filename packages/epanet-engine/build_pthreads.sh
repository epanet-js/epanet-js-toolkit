#!/bin/bash

set -e

echo "============================================="
echo "Compiling EPANET to WASM (pthreads + WasmFS + OPFS)"
echo "============================================="
(
    mkdir -p dist/pthreads

    # Read the EPANET functions from the JSON file and add memory management functions
    # Also add our OPFS helper functions
    EXPORTED_FUNCTIONS=$(cat build/epanet_exports.json | sed 's/]$/,"_epanet_supports_opfs","_epanet_can_mount_opfs","_epanet_mount_opfs"]/')

    emcc -O3 /opt/epanet/build-pthreads/lib/libepanet2.a \
    wasmfs_opfs.c \
    -o dist/pthreads/epanet.js \
    -s WASM=1 \
    -s "EXPORTED_FUNCTIONS=${EXPORTED_FUNCTIONS}" \
    -s MODULARIZE=1 \
    -s EXPORT_ES6=1 \
    -s FORCE_FILESYSTEM=1 \
    -s EXPORTED_RUNTIME_METHODS=['FS','getValue','lengthBytesUTF8','stringToUTF8','stringToNewUTF8','UTF8ToString','stackSave','cwrap','stackRestore','stackAlloc'] \
    -s ASSERTIONS=0 \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s ENVIRONMENT='web,worker' \
    -s WASMFS=1 \
    -pthread \
    -s PTHREAD_POOL_SIZE=2 \
    -msimd128 \
    -lopfs.js \
    --closure 0

    echo "Pthreads + WasmFS + OPFS build complete"
    echo "Output files:"
    ls -la dist/pthreads/
)
echo "============================================="
echo "Compiling pthreads wasm bindings done"
echo "============================================="
