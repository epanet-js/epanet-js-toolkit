ARG EMSDK_TAG_SUFFIX=""

FROM emscripten/emsdk:4.0.6${EMSDK_TAG_SUFFIX}

RUN apt-get update && \
    apt-get install -qqy git && \
    mkdir -p /opt/epanet/build && \
    git clone --depth 1 --branch v2.3.5 https://github.com/OpenWaterAnalytics/EPANET /opt/epanet/src
RUN cd /opt/epanet/build && \
    emcmake cmake ../src  && \
    emmake cmake --build . --config Release

# Build a pthreads-enabled version of the EPANET static library
# This is needed because pthreads builds require -pthread at both compile and link time
RUN mkdir -p /opt/epanet/build-pthreads && \
    cd /opt/epanet/build-pthreads && \
    emcmake cmake ../src -DCMAKE_C_FLAGS="-pthread" && \
    emmake cmake --build . --config Release
