#!/bin/bash

set -e

BUILD_VARIANT="${EPANET_ENGINE_VARIANT:-default}"
PTHREAD_POOL_SIZE="${EPANET_ENGINE_PTHREAD_POOL_SIZE:-4}"

case "$BUILD_VARIANT" in
    default)
        OUTPUT_BASENAME="index"
        ;;
    pthreads)
        OUTPUT_BASENAME="index.pthreads"
        ;;
    *)
        echo "Unsupported build variant: $BUILD_VARIANT" >&2
        exit 1
        ;;
esac

echo "============================================="
echo "Compiling EPANET to WASM"
echo "============================================="
(
    mkdir -p dist
    mkdir -p type-gen

    # Extract epanet2_2.h from the EPANET repository
    echo "Extracting epanet2_2.h..."
    cp /opt/epanet/src/include/epanet2_2.h type-gen/

    echo "Extracting epanet2_enums.h..."
    cp /opt/epanet/src/include/epanet2_enums.h type-gen/

    # Generate exports list
    echo "Generating exports list..."
    ./generate_exports.sh

    # Read the EPANET functions from the JSON file and add memory management functions
    EXPORTED_FUNCTIONS=$(node -e "const fs = require('fs'); const exported = JSON.parse(fs.readFileSync('build/epanet_exports.json', 'utf8')); exported.push('_epanet_supports_opfs', '_epanet_can_mount_opfs', '_epanet_mount_opfs'); process.stdout.write(JSON.stringify([...new Set(exported)]));")

        # OPFS is enabled through WasmFS at runtime and mounted explicitly under
        # /opfs when the caller requests it.
        # The default bundle stays single-threaded and falls back to memory.
        # The pthreads bundle enables a supported OPFS path for browser testing.
        EMCC_ARGS=(
            -O3
            /opt/epanet/build/lib/libepanet2.a
            opfs_root.c
            -o "dist/${OUTPUT_BASENAME}.js"
            -s WASM=1
            -s WASMFS=1
            -s "EXPORTED_FUNCTIONS=${EXPORTED_FUNCTIONS}"
            -s MODULARIZE=1
            -s EXPORT_ES6=1
            -s FORCE_FILESYSTEM=1
            -s EXPORTED_RUNTIME_METHODS=['FS','getValue','lengthBytesUTF8','stringToUTF8','stringToNewUTF8','UTF8ToString','stackSave','cwrap','stackRestore','stackAlloc']
            -s ASSERTIONS=0
            -s ALLOW_MEMORY_GROWTH=1
            -s SINGLE_FILE=1
            -s ASSERTIONS=1
            -s ENVIRONMENT=web,worker,node
            -msimd128
            --closure
            0
        )

        if [ "$BUILD_VARIANT" = "pthreads" ]; then
            EMCC_ARGS+=(
                -pthread
                -s PTHREAD_POOL_SIZE=${PTHREAD_POOL_SIZE}
                -s PTHREAD_POOL_SIZE_STRICT=2
            )
        fi

        # Optional experimental JSPI-based OPFS support for the single-threaded path:
        # EMCC_ARGS+=( -s JSPI=1 )

        echo "Build variant: ${BUILD_VARIANT}"
        emcc "${EMCC_ARGS[@]}"
    
    #-s EXPORT_ALL=1 \
    #-s SINGLE_FILE=1 \
    #-s "EXPORTED_FUNCTIONS=['_getversion', '_open_epanet', '_EN_close']" \



# We will use this in a switch to allow the slim loader version
# -s SINGLE_FILE=1 embeds the wasm file in the js file

# Export to ES6 module, you also need MODULARIZE for this to work
# By default these are not enabled
#    -s EXPORT_ES6=1 \
#    -s MODULARIZE=1 \

# Compile to a wasm file (though this is set by default)
#    -s WASM=1 \

# FORCE_FILESYSTEM
# Makes full filesystem support be included, even if statically it looks like it is not used.
# For example, if your C code uses no files, but you include some JS that does, you might need this.


#EXPORTED_RUNTIME_METHODS
# Blank for now but previously I used 
# EXPORTED_RUNTIME_METHODS='["ccall", "getValue", "UTF8ToString", "stringToUTF8", "_free", "intArrayToString","FS"]'

# ALLOW_MEMORY_GROWTH
# Allow the memory to grow as needed



## Things to look at later
# WASMFS
# https://emscripten.org/docs/tools_reference/settings_reference.html#wasmfs



    #mkdir -p dist
    #mv index.js dist
    #mv epanet_version.wasm dist

    echo "Creating ${OUTPUT_BASENAME}.cjs from ${OUTPUT_BASENAME}.js with CommonJS export"
    sed -e '$ s/export default Module;/module.exports = Module;/' -e 's/import\.meta\.url/__filename/' "dist/${OUTPUT_BASENAME}.js" > "dist/${OUTPUT_BASENAME}.cjs"

)
echo "============================================="
echo "Compiling wasm bindings done"
echo "============================================="