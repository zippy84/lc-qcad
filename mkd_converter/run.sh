#!/bin/bash
export PATH=$PATH:/home/zippy/opt/qcad-3.22.0-pro-linux-x86_64/

pushd ..
npm run build
popd

convert() {
    path1=$(realpath $1)
    path2=$(realpath $2)
    name=$(basename $path2 .dxf)
    out="${path1}/${name}_.dxf"
    qcad -allow-multiple-instances -autostart dist/convert.js $path2 $out
}

export -f convert

# mkdir -p mkd
# mkdir -p mkd2
# mkdir -p mkd3

# find ~/transfer/export -name "*.dxf" -exec bash -c 'convert mkd {}' \;
# find ~/transfer/export2 -name "*.dxf" -exec bash -c 'convert mkd2 {}' \;
# find ~/transfer/export3 -name "*.dxf" -exec bash -c 'convert mkd3 {}' \;

# convert example example/Fassade.dxf

# modify() {
#     path=$(realpath $1)
#     qcad -allow-multiple-instances -autostart modify_dims.js $path $2
# }

# modify mkd3/Revision_.dxf 10
# modify mkd3/Revision2_.dxf 10
# modify mkd3/Skizze_Treppe_.dxf 1
# modify mkd3/Skizze_Treppe_Anfang_.dxf 1
