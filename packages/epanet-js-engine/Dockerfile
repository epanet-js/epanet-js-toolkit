ARG EMSDK_TAG_SUFFIX=""
FROM emscripten/emsdk:4.0.6${EMSDK_TAG_SUFFIX}

RUN apt-get update && apt-get install -qqy git jq clang
RUN git config --global user.email build@epanetjs.com
RUN git config --global user.name "Build"

COPY . /opt/epanet
WORKDIR /opt/epanet
RUN npm install
