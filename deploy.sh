#!/bin/bash

~/go/bin/minify --type js -o dist/lc.js < <(gawk '@load "readfile"; BEGIN { printf "var cfg = %s;", readfile("cfg.json") }; !/kdTree.js/ && !/cfg.json/' 0*.js | cat kdTree.js -)

path=$(realpath $0)
cwd=${path%/*}
tmp=$(mktemp -d)
base=$tmp/LaserCuttingFormatter

#mkdir $base
#gawk -f _deploy.awk 0*.js > $base/lcBundle.js

gawk -f _deploy.awk 0*.js | ~/go/bin/minify --type js -o $base/lcBundle.js
cp $cwd/gui/* $base

cd $tmp
zip -rq - LaserCuttingFormatter > $cwd/dist/lcf-plugin.zip

cd $cwd

v=3.20.1

if [ -d "/home/zippy/opt/qcad-${v}-pro-linux-x86_64" ]
then
    mkdir -p /home/zippy/opt/qcad-${v}-pro-linux-x86_64/scripts/Misc/Modify
    unzip -oq dist/lcf-plugin.zip -d /home/zippy/opt/qcad-${v}-pro-linux-x86_64/scripts/Misc/Modify
fi
