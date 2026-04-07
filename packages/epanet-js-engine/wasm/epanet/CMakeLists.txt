cmake_minimum_required(VERSION 3.13)
project(epanet2 LANGUAGES C)

set(EPANET_DIR "${CMAKE_SOURCE_DIR}/build/EPANET")
set(EPANET_SRC_DIR "${CMAKE_SOURCE_DIR}/build/EPANET/src")

# EPANET engine source files (library only)
set(EPANET_SOURCES
    ${EPANET_SRC_DIR}/mempool.c
    ${EPANET_SRC_DIR}/rules.c
    ${EPANET_SRC_DIR}/flowbalance.c
    ${EPANET_SRC_DIR}/leakage.c
    ${EPANET_SRC_DIR}/funcs.h
    ${EPANET_SRC_DIR}/validate.c
    ${EPANET_SRC_DIR}/epanet2.c
    ${EPANET_SRC_DIR}/input2.c
    ${EPANET_SRC_DIR}/input1.c
    ${EPANET_SRC_DIR}/genmmd.c
    ${EPANET_SRC_DIR}/output.c
    ${EPANET_SRC_DIR}/hydsolver.c
    ${EPANET_SRC_DIR}/input3.c
    ${EPANET_SRC_DIR}/hydcoeffs.c
    ${EPANET_SRC_DIR}/util/errormanager.c
    ${EPANET_SRC_DIR}/util/filemanager.c
    ${EPANET_SRC_DIR}/util/cstr_helper.c
    ${EPANET_SRC_DIR}/inpfile.c
    ${EPANET_SRC_DIR}/qualreact.c
    #${EPANET_SRC_DIR}/outfile/src/epanet_output.c
    ${EPANET_SRC_DIR}/quality.c
    ${EPANET_SRC_DIR}/hydstatus.c
    ${EPANET_SRC_DIR}/hydraul.c
    ${EPANET_SRC_DIR}/smatrix.c
    ${EPANET_SRC_DIR}/epanet.c
    ${EPANET_SRC_DIR}/report.c
    ${EPANET_SRC_DIR}/project.c
    ${EPANET_SRC_DIR}/hash.c
    ${EPANET_SRC_DIR}/qualroute.c
)

add_library(epanet2 STATIC ${EPANET_SOURCES})

target_include_directories(epanet2 PUBLIC ${EPANET_SRC_DIR}
    ${EPANET_DIR}/include
    ${EPANET_DIR}/src
    ${EPANET_DIR}/src/util
#    ${EPANET_DIR}/src/outfile/include
#    ${EPANET_DIR}/src/outfile/src
)

target_compile_definitions(epanet2 PRIVATE
    -DEN_API_FLOAT_TYPE=double
)
