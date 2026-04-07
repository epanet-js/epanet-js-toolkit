cmake_minimum_required(VERSION 3.13)
project(epanetmsx LANGUAGES C)

set(MSX_SRC_DIR "${CMAKE_SOURCE_DIR}/build/EPANETMSX/src/solver")

# MSX library source files
set(MSX_SOURCES
    ${MSX_SRC_DIR}/mempool.c
    ${MSX_SRC_DIR}/ros2.c
    ${MSX_SRC_DIR}/msxfile.c
    ${MSX_SRC_DIR}/msxinp.c
    ${MSX_SRC_DIR}/msxdispersion.c
    ${MSX_SRC_DIR}/msxfuncs.c
    ${MSX_SRC_DIR}/msxtoolkit.c
    ${MSX_SRC_DIR}/rk5.c
    ${MSX_SRC_DIR}/msxerr.c
    ${MSX_SRC_DIR}/msxutils.c
    ${MSX_SRC_DIR}/msxchem.c
    ${MSX_SRC_DIR}/msxqual.c
    ${MSX_SRC_DIR}/msxtank.c
    ${MSX_SRC_DIR}/msxcompiler.c
    ${MSX_SRC_DIR}/msxproj.c
    ${MSX_SRC_DIR}/smatrix.c
    ${MSX_SRC_DIR}/newton.c
    ${MSX_SRC_DIR}/mathexpr.c
    ${MSX_SRC_DIR}/msxout.c
    ${MSX_SRC_DIR}/msxrpt.c
    ${MSX_SRC_DIR}/hash.c
)

add_library(epanetmsx STATIC ${MSX_SOURCES})

target_include_directories(epanetmsx PUBLIC
    ${MSX_SRC_DIR}
    ${MSX_SRC_DIR}/include
    ${CMAKE_SOURCE_DIR}/build/EPANET/include
)
