#!/bin/bash
export PATH=$PATH:/home/zippy/opt/qcad-3.22.0-pro-linux-x86_64/

pushd ..
npm run build
popd

mkdir -p mkd
mkdir -p mkd2
mkdir -p mkd3

convert() {
    dir=$(realpath $1)
    name=$(basename $2 .dxf)
    out="${dir}/${name}_.dxf"
    qcad -allow-multiple-instances -autostart dist/convert.js $2 $out
}

export -f convert

find ~/transfer/export -name "*.dxf" -exec bash -c 'convert mkd {}' \;
find ~/transfer/export2 -name "*.dxf" -exec bash -c 'convert mkd2 {}' \;
find ~/transfer/export3 -name "*.dxf" -exec bash -c 'convert mkd3 {}' \;
