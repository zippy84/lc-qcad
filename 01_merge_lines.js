/* Copyright (c) 2018-2020, Ronald Römer
This source code is licensed under the MIT license found in the
LICENSE file in the root directory of this source tree.
*/

include('/home/zippy/lc-qcad/tools.js');
include('/home/zippy/lc-qcad/kdTree.js');

var cfg = JSON.parse(readTextFile('/home/zippy/lc-qcad/cfg.json'));

(function() {
    var before = Date.now();

    var doc = getDocument();
    var di = getDocumentInterface();

    var entities = doc.queryAllEntities(false, true);

    var lay = doc.queryLayer(cfg['engraving-layer-name']),
        _layId = lay.getId();

    var pts = [];

    for (var i = 0; i < entities.length; i++) {
        var obj = entities[i],
            ent = doc.queryEntity(obj);

        if (isArcEntity(ent) || isLineEntity(ent)) {
            var sPt = ent.getStartPoint(),
                ePt = ent.getEndPoint();

            var layId = ent.getLayerId();

            pts.push({ 'x': sPt.x, 'y': sPt.y, 'obj': obj, 'end': 0, 'endPt': ePt, 'layId': layId });
            pts.push({ 'x': ePt.x, 'y': ePt.y, 'obj': obj, 'end': 1, 'endPt': sPt, 'layId': layId });

        }
    }

    function df (a, b) {
        return (a.x-b.x)*(a.x-b.x)+(a.y-b.y)*(a.y-b.y);
    }

    var tree = new kdTree(pts, df, ['x', 'y']);

    var dupl = {};

    for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        if (typeof dupl[p.obj] === 'undefined') {
            var nearest = tree.nearest(p, 20);

            for (var j = 0; j < nearest.length; j++) {
                var near = nearest[j];

                if (near[1] < 1e-5
                    && near[0].obj != p.obj
                    && typeof dupl[near[0].obj] === 'undefined'
                    && near[0].endPt.equalsFuzzy2D(p.endPt, 1e-5)) {

                    var shA = doc.queryEntity(near[0].obj).castToShape(),
                        shB = doc.queryEntity(p.obj).castToShape();

                    if (isArcShape(shA) && isArcShape(shB)) {
                        if (shA.equals(shB, 1e-5)) {
                            dupl[near[0].obj] = null;
                        }
                    } else {
                        dupl[near[0].obj] = null;
                    }
                }
            }
        }

    }

    var op = new RDeleteObjectsOperation(false);

    for (var d in dupl) {
        op.deleteObject(doc.queryEntity(parseInt(d)));
    }

    di.applyOperation(op);

    var pts2 = pts.filter(function (p) { return typeof dupl[p.obj] === 'undefined' && p.layId != _layId; });

    var filtered = pts2.map(function (p) { return p.obj; });

    tree = new kdTree(pts2, df, ['x', 'y']);

    for (var i = 0; i < pts2.length; i++) {
        pts2[i].i = i;
    }

    function GetAng (a, b) {
        var ang = Math.atan2(a.x*b.y-b.x*a.y, a.x*b.x+a.y*b.y);
        if (ang < 0) {
            ang += 2*Math.PI;
        }
        return ang;
    }

    function Mod (a, b) {
        return ((a%b)+b)%b;
    }

    var skip = {},
        shapes = {};

    for (var i = 0; i < pts2.length; i++) {
        if (typeof skip[i] === 'undefined') {

            var nearest = tree.nearest(pts2[i], 5);

            var found = nearest.filter(function (p) {
                return p[0].obj != pts2[i].obj
                    && p[1] < 1e-5
                    && pts2[i].layId == p[0].layId;
            });

            if (found.length > 1) {
                throw new Error('Ambiguous connection found at coordinate [' + pts2[i].x + ', ' + pts2[i].y + '].');

            } else if (found.length == 1) {
                var _obj = found[0][0],
                    ent = doc.queryEntity(_obj.obj),
                    sh = ent.castToShape();

                if (typeof shapes[_obj.obj] === 'undefined') {
                    shapes[_obj.obj] = sh.clone();
                }

                var _sh = shapes[_obj.obj];

                if (isLineShape(_sh)) {
                    if (_obj.end == 0) {
                        _sh.setStartPoint(new RVector(pts2[i].x, pts2[i].y));
                    } else {
                        _sh.setEndPoint(new RVector(pts2[i].x, pts2[i].y));
                    }

                } else {
                    // Arc
                    var phi = Mod(_sh.getEndAngle()-_sh.getStartAngle(), 2*Math.PI);

                    if (_sh.isReversed()) {
                        phi = 2*Math.PI-phi;
                    }

                    phi /= 2;

                    if (_obj.end == 1) {
                        var pt = _sh.getStartPoint();
                    } else {
                        var pt = _sh.getEndPoint();
                    }

                    var v = new RVector(pt.x-pts2[i].x, pt.y-pts2[i].y),
                        l = v.getMagnitude()/2;

                    v.normalize();

                    var d = l/Math.tan(phi);

                    var f = (_obj.end == 0 ^ _sh.isReversed()) ? 1 : -1;

                    var c = new RVector(pts2[i].x+l*v.x-f*d*v.y, pts2[i].y+l*v.y+f*d*v.x);

                    var vA = new RVector(pts2[i].x-c.x, pts2[i].y-c.y),
                        vB = new RVector(pt.x-c.x, pt.y-c.y);

                    var r = vA.getMagnitude();

                    vA.normalize();
                    vB.normalize();

                    var x = new RVector(1, 0);

                    var angA = GetAng(x, vA),
                        angB = GetAng(x, vB);

                    _sh.setCenter(c);
                    _sh.setRadius(r);

                    if (_obj.end == 0) {
                        _sh.setStartAngle(angA);
                        _sh.setEndAngle(angB);
                    } else {
                        _sh.setEndAngle(angA);
                        _sh.setStartAngle(angB);
                    }

                }

                skip[_obj.i] = null;

            }
        }
    }

    var op = new RModifyObjectsOperation(false);

    for (var s in shapes) {
        var ent = doc.queryEntity(parseInt(s));
        ent.setShape(shapes[s]);

        op.addObject(ent, false);
    }

    di.applyOperation(op);

    function Search (shs, side, layId) {
        if (side == 'right') {
            var sh = shs[shs.length-1];
            var pt = sh.shape.getEndPoint();
            var nearest = tree.nearest({ 'x': pt.x, 'y': pt.y }, 5);

            for (var i = 0; i < nearest.length; i++) {
                var near = nearest[i];

                if (near[1] < 1e-5
                    && near[0].obj != sh.id
                    && near[0].obj != shs[0].id
                    && layId == near[0].layId) {

                    var ent = doc.queryEntity(near[0].obj),
                        sh2 = ent.castToShape().clone();

                    if (near[0].end == 1) {
                        sh2.reverse();
                    }

                    shs.push({ 'shape': sh2, 'id': near[0].obj });

                    return true;

                }
            }
        } else {
            var sh = shs[0];
            var pt = sh.shape.getStartPoint();
            var nearest = tree.nearest({ 'x': pt.x, 'y': pt.y }, 5);

            for (var i = 0; i < nearest.length; i++) {
                var near = nearest[i];

                if (near[1] < 1e-5
                    && near[0].obj != sh.id
                    && near[0].obj != shs[shs.length-1].id
                    && layId == near[0].layId) {

                    var ent = doc.queryEntity(near[0].obj),
                        sh2 = ent.castToShape().clone();

                    if (near[0].end == 0) {
                        sh2.reverse();
                    }

                    shs.unshift({ 'shape': sh2, 'id': near[0].obj });

                    return true;

                }
            }
        }

        return false;
    }

    var visited = {};

    var op = new RAddObjectsOperation(false);

    for (var i = 0; i < filtered.length; i++) {
        var id = filtered[i];

        if (typeof visited[id] === 'undefined') {

            var f = doc.queryEntity(id);

            var shapes = [{ 'id': id, 'shape': f.castToShape().clone() }];

            while (Search(shapes, 'right', f.getLayerId())) {}
            while (Search(shapes, 'left', f.getLayerId())) {}

            shapes.forEach(function (s) {
                visited[s.id] = null;
            });

            var newPl = new RPolyline(shapes.map(function (s) { return s.shape; }));

            var pl = shapeToEntity(doc, newPl);

            pl.copyAttributesFrom(f.data());

            op.addObject(pl, false);

        }
    }

    for (var v in visited) {
        op.deleteObject(doc.queryEntity(parseInt(v)));
    }

    di.applyOperation(op);

    qDebug((Date.now()-before)/1e3, 's');

})();
