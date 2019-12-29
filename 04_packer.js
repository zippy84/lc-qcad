/* Copyright (c) 2018-2020, Ronald Römer
This source code is licensed under the MIT license found in the
LICENSE file in the root directory of this source tree.
*/

include('/home/zippy/lc-qcad/tools.js');

var cfg = JSON.parse(readTextFile('/home/zippy/lc-qcad/cfg.json'));

(function() {
    var before = Date.now();

    var doc = getDocument();
    var di = getDocumentInterface();

    // cleanup
    var bb = doc.queryBlock('BB');
    if (!isNull(bb)) {
        var _op = new RDeleteObjectsOperation(false);
        _op.deleteObject(bb);
        di.applyOperation(_op);
    }

    var entities = doc.queryAllEntities();

    var objs = [],
        num = entities.length;

    for (var i = 0; i < num; i++) {
        var entity = doc.queryEntity(entities[i]),
            bb = entity.getBoundingBox(),
            h = bb.getHeight(),
            w = bb.getWidth();

        objs.push({ h: h, w: w, area: h*w, entity: entity, pos: bb.getCorner1() });
    }

    // die großen zuerst
    objs.sort(function (a, b) {
        if (Math.abs(a.area-b.area) < 1e-5) {
            return 0;
        } else if (a.area < b.area) {
            return 1;
        } else {
            return -1;
        }
    });

    function Node (x, y, h, w) {
        this.empty = true;
        this.x = x;
        this.y = y;
        this.h = h;
        this.w = w;
    }

    function Pack (off) {

        var h = cfg['paper-size'][0]-2*cfg['paper-padding'],
            w = cfg['paper-size'][1]-2*cfg['paper-padding'];

        var nodes = [new Node(off, 0, h, w)];

        for (var i = 0; i < num; i++) {
            var obj = objs[i];

            if (obj.hasOwnProperty('node')) {
                continue;
            }

            for (var j = 0; j < nodes.length; j++) {
                var node = nodes[j];

                if (!node.empty) {
                    continue;
                }

                var oh = obj.h+2*cfg['packing-padding'],
                    ow = obj.w+2*cfg['packing-padding'];

                // passt das obj in den node?
                if (ow <= node.w
                    && oh <= node.h) {

                    node.empty = false;

                    var dw = node.w-ow,
                        dh = node.h-oh;

                    if (dw > dh) {
                        nodes.push(new Node(node.x, node.y+oh,
                            node.h-oh, ow)); // A
                        nodes.push(new Node(node.x+ow, node.y,
                            node.h, node.w-ow)); // B
                    } else {
                        nodes.push(new Node(node.x+ow, node.y,
                            oh, node.w-ow)); // A
                        nodes.push(new Node(node.x, node.y+oh,
                            node.h-oh, node.w)); // B
                    }

                    nodes.sort(function (a, b) {
                        if (Math.abs(a.x-b.x) < 1e-5) {
                            if (a.y < b.y) { return -1; }
                            else { return 1; }
                        } else {
                            if (a.x < b.x) { return -1; }
                            else { return 1; }
                        }
                    });

                    obj.node = node;

                    break;
                }
            }
        }

        return objs.some(function (obj) { return !obj.hasOwnProperty('node'); });

    }

    for (var i = 0; Pack(i*cfg['paper-size'][1]); i++) {}

    var op = new RAddObjectsOperation(false);

    var block = new RBlock(doc, 'BB', new RVector(0, 0));

    op.addObject(block, false);

    di.applyOperation(op);

    var op2 = new RModifyObjectsOperation(false);

    doc.setCurrentLayer(doc.getLayer0Id());

    for (var i = 0; i < num; i++) {
        var obj = objs[i],
            node = obj.node;

        var x = node.x+cfg['paper-padding'],
            y = node.y+cfg['paper-padding'];

        var a = new RVector(x, y),
            b = new RVector(x+node.w, y+node.h);

        var box = new RBox(a, b),
            boxEnt = new RPolylineEntity(doc, new RPolylineData());
        boxEnt.setShape(box.getPolyline2d());

        boxEnt.setBlockId(block.getId());

        op2.addObject(boxEnt, false);

        var v = new RVector(x-obj.pos.x+cfg['packing-padding'],
            y-obj.pos.y+cfg['packing-padding']);

        obj.entity.move(v);

        op2.addObject(obj.entity, false);

    }

    var ref = new RBlockReferenceEntity(doc, new RBlockReferenceData(block.getId(), new RVector(0, 0), new RVector(1, 1), 0));
    ref.setBlockId(doc.getModelSpaceBlockId());
    op2.addObject(ref, false);

    di.applyOperation(op2);

    qDebug((Date.now()-before)/1e3, 's');

})();
