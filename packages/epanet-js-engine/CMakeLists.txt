cmake_minimum_required(VERSION 3.13)
project(EpanetEngine LANGUAGES C)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)
set(CMAKE_EXECUTABLE_SUFFIX ".js")

# Build libraries
add_subdirectory(wasm/epanet)
add_subdirectory(wasm/epanet-msx)

# Generate empty entrypoint required by CMake to produce a link step
file(WRITE "${CMAKE_CURRENT_BINARY_DIR}/entrypoint.c"
    "/* auto-generated empty entrypoint */\ntypedef int emscripten_entrypoint_dummy;\n")

# Create WASM module
add_executable(EpanetEngine
    "${CMAKE_CURRENT_BINARY_DIR}/entrypoint.c"
)

if(INCLUDE_MSX)
    target_compile_definitions(EpanetEngine PRIVATE INCLUDE_MSX)
    target_link_libraries(EpanetEngine epanetmsx epanet2)
else()
    target_link_libraries(EpanetEngine epanet2)
endif()

target_include_directories(EpanetEngine PRIVATE
    ${CMAKE_SOURCE_DIR}/EPANETMSX/src/solver/include
    ${CMAKE_SOURCE_DIR}/EPANETMSX/src/solver
    ${CMAKE_SOURCE_DIR}/EPANET/include
    ${CMAKE_SOURCE_DIR}/EPANET/src
    ${CMAKE_SOURCE_DIR}/EPANET/src/util
    ${CMAKE_SOURCE_DIR}/EPANET/src/outlfile/include
    ${CMAKE_SOURCE_DIR}/EPANET/src/outlfile/src
)

# Emscripten linker flags for epanet-js compatible module
if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    set(BUILD_TYPE_LINK_FLAGS "\
        -O0 \
        -g \
        --profiling-funcs \
        -s ASSERTIONS=2 \
        -s STACK_OVERFLOW_CHECK=2")
else()
    set(BUILD_TYPE_LINK_FLAGS "\
        -O2 \
        -flto \
        -s ASSERTIONS=0")
endif()

if(SINGLE_FILE)
    set(SINGLE_FILE_LINK_FLAG "-s SINGLE_FILE=1")
else()
    set(SINGLE_FILE_LINK_FLAG "-s SINGLE_FILE=0")
endif()

set_target_properties(EpanetEngine PROPERTIES
    LINK_FLAGS "\
        ${BUILD_TYPE_LINK_FLAGS} \
        -s WASM=1 \
        -s MODULARIZE=1 \
        -s EXPORT_ES6=1 \
        -s EXPORT_NAME='EpanetEngine' \
        -s ENVIRONMENT=web \
        -s ALLOW_MEMORY_GROWTH=1 \
        ${SINGLE_FILE_LINK_FLAG} \
        -s FILESYSTEM=1 \
        -s FORCE_FILESYSTEM=1 \
        -s EXPORTED_RUNTIME_METHODS=['HEAPF64','HEAPF32','HEAP32','HEAPU32','FS','ccall','cwrap','allocateUTF8','UTF8ToString','getValue','setValue'] \
        -s EXPORTED_FUNCTIONS=@${CMAKE_CURRENT_BINARY_DIR}/exports.json \
        -s NO_EXIT_RUNTIME=1 \
        --no-entry \
        -msimd128 \
        --closure 0"
)
