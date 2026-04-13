#!/bin/bash

EMSDK_TAG_SUFFIX=""

if [ "$(arch)" = "arm64" ]; then
  EMSDK_TAG_SUFFIX="-arm64"
fi

docker build --build-arg EMSDK_TAG_SUFFIX=$EMSDK_TAG_SUFFIX -t epanet-js-engine .
