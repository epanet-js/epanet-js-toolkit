cmake_minimum_required(VERSION 3.13)
project(epanet2 LANGUAGES C)

set(EPANET_DIR "${CMAKE_SOURCE_DIR}/build/EPANET")
set(EPANET_SRC_DIR "${CMAKE_SOURCE_DIR}/build/EPANET/src")

# EPANET engine source files: all .c files under EPANET/src, excluding epanet_output.c
file(GLOB_RECURSE EPANET_SOURCES "${EPANET_SRC_DIR}/*.c")
list(FILTER EPANET_SOURCES EXCLUDE REGEX "epanet_output\\.c$")

add_library(epanet2 STATIC ${EPANET_SOURCES})

target_include_directories(epanet2 PUBLIC ${EPANET_SRC_DIR}
    ${EPANET_DIR}/include
    ${EPANET_DIR}/src
    ${EPANET_DIR}/src/util
)

target_compile_definitions(epanet2 PRIVATE
    -DEN_API_FLOAT_TYPE=double
)

if(NOT CMAKE_BUILD_TYPE STREQUAL "Debug")
    target_compile_options(epanet2 PRIVATE -O2 -flto)
else()
    target_compile_options(epanet2 PRIVATE -O0)
endif()
