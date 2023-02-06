#!/bin/bash
export PATH=$PATH:/home/zippy/opt/qcad-3.22.0-pro-linux-x86_64/

mkdir -p mkd/out
mkdir -p mkd2/out

find mkd -maxdepth 1 -name "*.dxf" -exec qcad -allow-multiple-instances -autostart convert.js $(realpath {}) \;
find mkd2 -maxdepth 1 -name "*.dxf" -exec qcad -allow-multiple-instances -autostart convert.js $(realpath {}) \;
