#!/bin/bash

set -e

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
    EXPORTED_FUNCTIONS=$(cat build/epanet_exports.json )

    emcc -O3 /opt/epanet/build/lib/libepanet2.a \
    -o dist/index.js \
    -s WASM=1 \
    -s "EXPORTED_FUNCTIONS=${EXPORTED_FUNCTIONS}" \
    -s MODULARIZE=1 \
    -s EXPORT_ES6=1 \
    -s FORCE_FILESYSTEM=1 \
    -s EXPORTED_RUNTIME_METHODS=['FS','getValue','lengthBytesUTF8','stringToUTF8','stringToNewUTF8','UTF8ToString','stackSave','cwrap','stackRestore','stackAlloc'] \
     -s ASSERTIONS=0 \
   -s ALLOW_MEMORY_GROWTH=1 \
    -s SINGLE_FILE=1 \
    -s ENVIRONMENT=web \
     -msimd128 \
     --closure 0 \
    # -s SAFE_HEAP=0 \
    # -s INITIAL_MEMORY=1024MB \
     
    
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

    echo "Creating index.cjs from index.js with CommonJS export"
    sed -e '$ s/export default Module;/module.exports = Module;/' -e 's/import\.meta\.url/__filename/' dist/index.js > dist/index.cjs

)
echo "============================================="
echo "Compiling wasm bindings done"
echo "============================================="