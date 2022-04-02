#!/bin/bash
npm run build

export PATH=$PATH:/home/zippy/opt/qcad-3.22.0-pro-linux-x86_64/

while read dxf; do
    [[ $dxf =~ ^#.* ]] && continue
    qcad -allow-multiple-instances -autostart dist/index.js $dxf
done <<-EOF
    # /home/zippy/transfer/Laserfirstcut/Worbis/0_65.dxf
    # /home/zippy/transfer/Laserfirstcut/Worbis/0_65_2.dxf
    # /home/zippy/transfer/Laserfirstcut/Worbis/1.dxf
    # /home/zippy/transfer/Laserfirstcut/Worbis/1_5.dxf
    # /home/zippy/transfer/Laserfirstcut/Worbis/2.dxf
    # /home/zippy/transfer/Laserfirstcut/Dingelstädt/0_45.dxf
    # /home/zippy/transfer/Laserfirstcut/Dingelstädt/0_5_mist.dxf
    # /home/zippy/transfer/Laserfirstcut/Dingelstädt/0_5_rot.dxf
    # /home/zippy/transfer/Laserfirstcut/Dingelstädt/0_65.dxf
    # /home/zippy/transfer/Laserfirstcut/Dingelstädt/1_5.dxf
    # /home/zippy/transfer/Laserfirstcut/Dingelstädt/1.dxf
    # /home/zippy/transfer/Laserfirstcut/Dingelstädt/1_holz.dxf
    # /home/zippy/transfer/Laserfirstcut/Dingelstädt/1_rot.dxf
    # /home/zippy/transfer/Laserfirstcut/Dingelstädt/2.dxf
    # /home/zippy/transfer/Laserfirstcut/Dingelstädt/2_rot.dxf
EOF
