#!/bin/bash

npx uglifyjs -c -m -o dist/lc.js < <(gawk '@load "readfile"; BEGIN { printf "var cfg = %s;", readfile("cfg.json") }; !/kdTree.js/ && !/cfg.json/ && !/tools.js/' 0*.js | cat kdTree.js tools.js -)

path=$(realpath $0)
cwd=${path%/*}
tmp=$(mktemp -d)
base=$tmp/LaserCuttingFormatter

mkdir $base

gawk -f _deploy.awk 0*.js | npx uglifyjs -c -m -o $base/lcBundle.js
cp $cwd/gui/* $base

cd $tmp
zip -rq - LaserCuttingFormatter > $cwd/dist/lcf-plugin.zip

cd $cwd

v=3.22.0

if [ -d "/home/zippy/opt/qcad-${v}-pro-linux-x86_64" ]
then
    mkdir -p /home/zippy/opt/qcad-${v}-pro-linux-x86_64/scripts/Misc/Modify
    unzip -oq dist/lcf-plugin.zip -d /home/zippy/opt/qcad-${v}-pro-linux-x86_64/scripts/Misc/Modify
fi
