/* Copyright (c) 2018-2020, Ronald Römer
This source code is licensed under the MIT license found in the
LICENSE file in the root directory of this source tree.
*/

include('/home/zippy/lc-qcad/tools.js');

var cfg = JSON.parse(readTextFile('/home/zippy/lc-qcad/cfg.json'));

(function () {

    var doc = getDocument();
    var di = getDocumentInterface();
    var entities = doc.queryAllEntities();

    // AABB-tree

    var nodes = [];

    function BB (minX, maxX, minY, maxY) {
        this.minX = minX;
        this.maxX = maxX;
        this.minY = minY;
        this.maxY = maxY;

        this.merge = function (other) {
            return new BB (Math.min(this.minX, other.minX),
                Math.max(this.maxX, other.maxX),
                Math.min(this.minY, other.minY),
                Math.max(this.maxY, other.maxY));
        }

        this.area = function () {
            return (this.maxX-this.minX)*(this.maxY-this.minY);
        }

        this.contains = function (other) {
            return other.minX > this.minX
                && other.maxX < this.maxX
                && other.minY > this.minY
                && other.maxY < this.maxY;
        }
    }

    function Node () {
        this.left = null;
        this.right = null;
        this.parent = null;
        this.bb = null;
        this.obj = null;
    }

    var rootId = null;

    function AddNode (node) {
        nodes.push(node);
        return nodes.length-1;
    }

    function Update (id) {
        while (id !== null) {
            var node = nodes[id];

            node.bb = nodes[node.left].bb.merge(nodes[node.right].bb);

            id = node.parent;
        }
    }

    function InsertObj (id) {
        var obj = doc.queryEntity(id),
            box = obj.getBoundingBox();

        var a = box.getCorner1(),
            b = box.getCorner2();

        var node = new Node();
        node.bb = new BB(a.x, b.x, a.y, b.y);
        node.obj = id;

        var nodeId = AddNode(node);

        if (rootId === null) {
            rootId = nodeId;
        } else {

            var _id = rootId;

            while (nodes[_id].left !== null) {
                var curr = nodes[_id];

                var bb = curr.bb.merge(node.bb),
                    diff = bb.area()-curr.bb.area();

                var bbA = nodes[curr.left].bb.merge(node.bb),
                    bbB = nodes[curr.right].bb.merge(node.bb);

                var cLeft, cRight;

                if (nodes[curr.left].left === null) {
                    cLeft = bbA.area()+diff;
                } else {
                    cLeft = bbA.area()-nodes[curr.left].bb.area()+diff;
                }

                if (nodes[curr.right].left === null) {
                    cRight = bbB.area()+diff;
                } else {
                    cRight = bbB.area()-nodes[curr.right].bb.area()+diff;
                }

                if (bb.area() < cLeft && bb.area() < cRight) {
                    break;
                }

                if (cLeft < cRight) {
                    _id = curr.left;
                } else {
                    _id = curr.right;
                }

            }

            var parA = nodes[_id].parent;

            var parB = new Node();
            parB.bb = nodes[_id].bb.merge(node.bb);

            parB.left = _id;
            parB.right = nodeId;
            parB.parent = parA;

            var idB = AddNode(parB);

            nodes[_id].parent = idB;
            nodes[nodeId].parent = idB;

            if (parA === null) {
                rootId = idB;
            } else if (nodes[parA].left == _id) {
                nodes[parA].left = idB;
            } else {
                nodes[parA].right = idB;
            }

            Update(parA);

        }

    }

    var filtered = [],
        others = [];

    for (var i = 0; i < entities.length; i++) {
        var id = entities[i],
            ent = doc.queryEntity(id);

        if (isPolylineEntity(ent) || isArcEntity(ent) || isLineEntity(ent)) {
            if (ent.getLayerName() == cfg['engraving-layer-name']) {
                others.push(id);

            } else {
                InsertObj(id);
                filtered.push(id);
            }
        }
    }

    var bbs = {};

    //var op = new RAddObjectsOperation(false);

    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i],
            box = new RBox(new RVector(node.bb.minX, node.bb.minY),
                new RVector(node.bb.maxX, node.bb.maxY));

        //var boxEnt = shapeToEntity(doc, box.getPolyline2d());
        //op.addObject(boxEnt, false);

        if (node.obj !== null) {
            bbs[node.obj] = node.bb;
        }
    }

    //di.applyOperation(op);

    function Search (id) {
        var found = [];

        var stack = [rootId];

        var bb = bbs[id];

        while (stack.length > 0) {
            var s = stack.shift();

            if (s === null) {
                continue;
            }

            if (nodes[s].bb.contains(bb)) {
                if (nodes[s].left === null && nodes[s].obj != id) {
                    found.push(nodes[s].obj);
                } else {
                    stack.push(nodes[s].left);
                    stack.push(nodes[s].right);
                }
            }
        }

        return found;
    }

    function Search2 (pt) {
        var found = [];

        var stack = [rootId];

        while (stack.length > 0) {
            var s = stack.shift();

            if (s === null) {
                continue;
            }

            var bb = nodes[s].bb;

            if (pt.x > bb.minX && pt.x < bb.maxX
                && pt.y > bb.minY && pt.y < bb.maxY) {

                if (nodes[s].left === null) {
                    found.push(nodes[s].obj);
                } else {
                    stack.push(nodes[s].left);
                    stack.push(nodes[s].right);
                }
            }
        }

        return found;
    }

    var parents = filtered.slice(0),
        childs = {};

    for (var i = 0; i < filtered.length; i++) {
        var pars = Search(filtered[i]);

        var ent = doc.queryEntity(filtered[i]),
            sh = ent.castToShape();

        if (pars.length > 0) {

            for (var j = 0; j < pars.length; j++) {
                var par = doc.queryEntity(pars[j]),
                    parSh = par.castToShape();

                if (parSh.containsShape(sh)) {
                    parents.splice(parents.indexOf(filtered[i]), 1);

                    if (!childs.hasOwnProperty(pars[j])) {
                        childs[pars[j]] = [];
                    }

                    childs[pars[j]].push(filtered[i]);

                    break;
                }
            }
        }
    }

    // ordnet die gravuren zu

    for (var i = 0; i < others.length; i++) {
        var ent = doc.queryEntity(others[i]),
            sh = ent.castToShape();

        var mids = sh.getMiddlePoints();

        var pars = Search2(mids[0]);

        for (var j = 0; j < pars.length; j++) {
            var par = doc.queryEntity(pars[j]),
                parSh = par.castToShape();

            if (parents.indexOf(pars[j]) != -1
                && parSh.contains(mids[0])) {
                if (!childs.hasOwnProperty(pars[j])) {
                    childs[pars[j]] = [];
                }

                childs[pars[j]].push(others[i]);

                break;
            }
        }
    }

    // gruppiert nach größe

    var sizes = {};

    for (var i = 0; i < parents.length; i++) {
        var par = parents[i],
            bb = bbs[par];

        var s = (bb.maxY-bb.minY).toFixed(4) + ',' + (bb.maxX-bb.minX).toFixed(4);

        if (!sizes.hasOwnProperty(s)) {
            sizes[s] = [];
        }

        sizes[s].push(par);

    }

    var c = 0;

    var blocks = {};

    var op = new RAddObjectsOperation(false);

    for (var s in sizes) {
        var blk = new RBlock(doc, 'B' + c++, new RVector(0, 0));
        op.addObject(blk, false);
        blocks[s] = blk;
    }

    di.applyOperation(op);

    var op2 = new RAddObjectsOperation(false);

    for (var s in sizes) {
        var pars = sizes[s],
            bb = bbs[pars[0]],
            w = bb.maxX-bb.minX,
            h = bb.maxY-bb.minY;

        var ref = new RBlockReferenceEntity(doc, new RBlockReferenceData(blocks[s].getId(), new RVector(bb.minX, bb.minY), new RVector(1, 1), 0));

        op2.addObject(ref, false);

        for (var i = 0; i < pars.length; i++) {
            var par = pars[i],
                ent = doc.queryEntity(par),
                curr = new RVector(bbs[par].minX, bbs[par].minY);

            var newPos = w < h ? new RVector(bb.minX+i*(w+cfg['equal-sized-objects-dist']), bb.minY) : new RVector(bb.minX, bb.minY+i*(h+cfg['equal-sized-objects-dist']));

            var vec = new RVector(newPos.x-curr.x-bb.minX, newPos.y-curr.y-bb.minY);

            ent.setBlockId(blocks[s].getId());
            ent.move(vec);

            op2.addObject(ent, false);

            if (childs.hasOwnProperty(par)) {
                for (var j = 0; j < childs[par].length; j++) {
                    var inner = doc.queryEntity(childs[par][j]);

                    inner.setBlockId(blocks[s].getId());
                    inner.move(vec);

                    op2.addObject(inner, false);
                }

            }

        }
    }

    di.applyOperation(op2);

    if (cfg['extend-engraving'] > 0) {
        var op3 = new RModifyObjectsOperation(false);

        var blocks = doc.queryAllBlocks();

        for (var i = 0; i < blocks.length; i++) {
            if (blocks[i] == doc.getModelSpaceBlockId()) {
                continue;
            }

            var itms = doc.queryBlockEntities(blocks[i]);
            
            var segs = [];

            for (var j = 0; j < itms.length; j++) {
                var itm = doc.queryEntity(itms[j]);

                if (itm.getLayerName() != cfg['engraving-layer-name']) {
                    Array.prototype.push.apply(segs, itm.getExploded());
                }
            }

            for (var j = 0; j < itms.length; j++) {
                var itm = doc.queryEntity(itms[j]),
                    sh = itm.castToShape();

                if (itm.getLayerName() == cfg['engraving-layer-name']
                    && isLineEntity(itm)) {

                    var pts = sh.getEndPoints();

                    for (var k = 0; k < 2; k++) {
                        var ptA = pts[k],
                            ptB = pts[(k+1)%2];

                        for (var l = 0; l < segs.length; l++) {
                            var seg = segs[l];

                            if (seg.isOnShape(ptA)
                                && !seg.getStartPoint().equalsFuzzy(ptA, .1)
                                && !seg.getEndPoint().equalsFuzzy(ptA, .1)) {

                                var v = ptB.operator_subtract(ptA).normalize().operator_multiply(cfg['extend-engraving']);

                                var ptC = ptA.operator_subtract(v);

                                if (k == 0) {
                                    itm.setStartPoint(ptC);
                                } else {
                                    itm.setEndPoint(ptC);
                                }

                                op3.addObject(itm, false);

                                break;

                            }
                        }
                    }
                }
            }
        }

        di.applyOperation(op3);

    }

})();
