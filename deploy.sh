#!/bin/bash

npm run build
zip -r dist/AddGaps.zip AddGaps/

# dir=$(realpath $0)

# tmp=$(mktemp -d)
# path="${tmp}/Prepare"
# mkdir $path

# cp Prepare/* $path
# cp dist/index.js $path

# pushd $tmp
# zip -r "${dir%/*}/dist/Prepare.zip" Prepare/
# popd

# rm dist/index.js

mv dist/index.js Prepare/
zip -r dist/Prepare.zip Prepare/
rm Prepare/index.js

unzip -o dist/Prepare.zip -d /home/zippy/opt/qcad-3.22.0-pro-linux-x86_64/scripts/Misc/Modify/
unzip -o dist/AddGaps.zip -d /home/zippy/opt/qcad-3.22.0-pro-linux-x86_64/scripts/Misc/Modify/
