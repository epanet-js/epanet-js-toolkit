ARG EMSDK_TAG_SUFFIX=""

FROM emscripten/emsdk:4.0.6${EMSDK_TAG_SUFFIX}

RUN apt-get update && \
    apt-get install -qqy git && \
    mkdir -p /opt/epanet/build && \
    git clone --depth 1 --branch v2.3.5 https://github.com/OpenWaterAnalytics/EPANET /opt/epanet/src
RUN cd /opt/epanet/build && \
    emcmake cmake ../src  && \
    emmake cmake --build . --config Release
