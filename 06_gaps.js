/* Copyright (c) 2018-2020, Ronald Römer
This source code is licensed under the MIT license found in the
LICENSE file in the root directory of this source tree.
*/

include('/home/zippy/lc-qcad/tools.js');

var cfg = JSON.parse(readTextFile('/home/zippy/lc-qcad/cfg.json'));

function GetCX (pts) {
    // graham scan

    var n = pts.length;

    var s = 0;
    for (var i = 1; i < n; i++) {
        if (pts[i].y < pts[s].y) {
            s = i;
        }
    }

    var dat = [];
    dat.length = n;

    dat[s] = { 'i': s, 'ang': 0, 'l': 0 };

    for (var i = 0; i < n; i++) {
        if (i != s) {
            var p = [pts[i].x-pts[s].x, pts[i].y-pts[s].y],
                l = Math.sqrt(p[0]*p[0]+p[1]*p[1]);

            dat[i] = { 'i': i, 'ang': Math.acos(p[0]/l), 'l': l };
        }
    }

    dat.sort(function (a, b) {
        if (a.ang < b.ang) {
            return -1;
        } else if (a.ang > b.ang) {
            return 1;
        }
        return 0;
    });

    var dat2 = [];

    // löscht einträge mit gleichen winkeln

    var angs = dat.map(function (itm) { return itm.ang.toFixed(4); });

    var uniq = angs.filter(function(itm, pos, ary) {
        return !pos || itm != ary[pos-1];
    });

    for (var i = 0; i < uniq.length; i++) {
        var inds = angs.reduce(function(ary, val, idx) {
            if (val == uniq[i]) {
                ary.push(idx);
            }
            return ary;
        }, []);

        var ls = inds.map(function (ind) { return dat[ind].l; });

        dat2.push(dat[inds[ls.indexOf(Math.max.apply(null, ls))]]);
    }

    if (dat2[0].i != s) {
        dat2.unshift({ 'i': s, 'ang': 0, 'l': 0 });
    }

    var cx = [0, 1];

    var n_ = dat2.length;

    var i = 2;
    while (i < n_) {
        var m = cx.length;

        var a = cx[m-2],
            b = cx[m-1];

        var pA = pts[dat2[a].i],
            pB = pts[dat2[b].i],
            pC = pts[dat2[i].i];

        var d = (pB.x-pA.x)*(pC.y-pA.y)
            -(pC.x-pA.x)*(pB.y-pA.y);

        if (d > 1e-5) {
            cx.push(i);
            i++;
        } else {
            cx.pop();
        }
    }

    var res = [];
    for (var i = 0; i < cx.length; i++) {
        res.push(dat2[cx[i]].i);
    }

    RemoveInts(pts, res);

    return res;

}

function _ (v) {
    return Math.min(1, Math.max(-1, v));
}

function GetOBB (pts, cx) {
    var _pts = cx.map(function (id) { return pts[id]; });

    var ys = _pts.map(function (pt) { return pt.y; });

    var yMn = Math.min.apply(null, ys);
    var idA = ys.indexOf(yMn);

    var yMx = Math.max.apply(null, ys);
    var idB = ys.indexOf(yMx);

    var n = _pts.length;

    var ref = new RVector(1, 0);

    var _id = idA;

    var s = 0;

    var dat = [];

    var changed = false;

    do {
        var nxtA = (idA+1)%n;
        var nxtB = (idB+1)%n;

        var vA = _pts[nxtA].operator_subtract(_pts[idA]);
        var vB = _pts[nxtB].operator_subtract(_pts[idB]);

        vA.normalize();
        vB.normalize();

        var angA = Math.acos(_(vA.dot(ref)));
        var angB = Math.acos(_(vB.dot(ref.getNegated())));

        if (angA < angB) {
            ref = vA;
            idA = nxtA;

            changed = true;
        } else {
            ref = vB.getNegated();
            idB = nxtB;
        }

        // flächeninhalt

        var perp = new RVector(-ref.y, ref.x);

        var ws = [0],
            hs = [0];

        for (var i = 1; i < _pts.length; i++) {
            var v = _pts[i].operator_subtract(_pts[0]);

            ws.push(v.dot(ref));
            hs.push(v.dot(perp));
        }

        var ext = [Math.min.apply(null, ws), Math.max.apply(null, ws),
            Math.min.apply(null, hs), Math.max.apply(null, hs)];

        var width = ext[1]-ext[0],
            height = ext[3]-ext[2];

        var area = height*width;

        // darstellung

        var vecs = [ref.operator_multiply(ext[0]).operator_add(perp.operator_multiply(ext[2])),
            ref.operator_multiply(ext[1]).operator_add(perp.operator_multiply(ext[2])),
            ref.operator_multiply(ext[1]).operator_add(perp.operator_multiply(ext[3])),
            ref.operator_multiply(ext[0]).operator_add(perp.operator_multiply(ext[3]))];

        var rect = new RPolyline([_pts[0].operator_add(vecs[0]),
            _pts[0].operator_add(vecs[1]),
            _pts[0].operator_add(vecs[2]),
            _pts[0].operator_add(vecs[3])], true);

        dat.push([area, height, width, ref, rect]);

        s++;
    } while (!changed || idA != _id);

    var areas = dat.map(function (itm) { return itm[0]; });

    var best = dat[areas.indexOf(Math.min.apply(null, areas))];

    return best;

}

function TestLD (a, b, c) {
    var vA = b.operator_subtract(a),
        vB = c.operator_subtract(a);

    vB.normalize();

    var d = Math.abs(-vB.y*vA.x+vB.x*vA.y);

    return d < 1e-5;
}

function RemoveInts (pts, cx) {
    var num = cx.length;

    var ids = [];

    for (var i = 0; i < num; i++) {
        var j = (i+1)%num,
            k = (j+1)%num;

        var pA = pts[cx[i]],
            pB = pts[cx[j]],
            pC = pts[cx[k]];

        if (TestLD(pA, pB, pC)) {
            ids.push(j);
        }
    }

    ids.reverse();

    for (var i = 0; i < ids.length; i++) {
        cx.splice(ids[i], 1);
    }
}

function GetInfos (pts, cx, obb) {
    var infos = [];

    var num = pts.length;

    var ref = obb[3],
        perp = new RVector(-ref.y, ref.x);

    var cxNum = cx.length;

    for (var i = 0; i < cxNum; i++) {
        var j = (i+1)%cxNum;

        var pA = pts[cx[i]],
            pB = pts[cx[j]];

        var v = pB.operator_subtract(pA);

        var x = ref.dot(v),
            y = perp.dot(v);

        var ax = Math.abs(x),
            ay = Math.abs(y);

        var nxt = cx[i];

        var info = { 'side': ax > ay ? (x > 0 ? 'A' : 'C') : (y > 0 ? 'B' : 'D'), 'ids': [nxt], 'v': v.getNormalized(), 'l': v.getMagnitude() };

        var c = 0;

        for (;;) {
            nxt = (nxt+1)%num;

            if (nxt == cx[j]) {
                info.ids.push(nxt);
                break;
            }

            if (TestLD(pA, pB, pts[nxt])) {
                info.ids.push(nxt);
            }

            c++;

        }

        info.real = c == 0;

        infos.push(info);

    }

    return infos;
}

function AddGaps (pts, ids, q, _a) {
    var pA = pts[ids[0]],
        pB = pts[ids[1]];

    var v = pB.operator_subtract(pA);

    var l = v.getMagnitude();
    v.normalize();

    if (l > 2) {

        var n = l/cfg['gap-min-dist']>>0;

        if (n == 0) {
            n = 1;
        }

        var d = l/n;

        // längere kanten haben so mehr als ein gap
        if (_a && n == 1 && l > cfg['gap-min-dist'] && d/cfg['gap-min-dist'] > .5) {
            d = l/++n;
        }

        var mids = [];

        for (var i = 0; i < n; i++) {
            var mid = pA.operator_add(v.operator_multiply((i+.5)*d));

            mids.push(mid);
        }

        var all = [pA];

        for (var i = 0; i < n; i++) {
            all.push(mids[i].operator_add(v.operator_multiply(-cfg['gap-width']/2)));
            all.push(mids[i].operator_add(v.operator_multiply(cfg['gap-width']/2)));
        }

        all.push(pB);

        var lines = [];

        for (var i = 0; i < n+1; i++) {
            lines.push([all[2*i], all[2*i+1]]);
        }

        // inds[0]: lines

        q[ids[0]] = lines;

    }
}

function AddSideGaps (pts, infos, sides, q) {

    for (var i = 0; i < infos.length; i++) {
        var info = infos[i];

        if ((info.real || info.ids.length > 2)
            && sides.indexOf(info.side) > -1) {

            if (info.ids.length == 2) {
                AddGaps(pts, info.ids, q, true);

            } else if (info.ids.length%2 == 0) {

                var r = {};

                var n = info.ids.length/2;

                for (var j = 0; j < n; j++) {
                    var e = info.ids[2*j],
                        f = info.ids[2*j+1];

                    AddGaps(pts, [e, f], r, false);
                }

                var homog = Object.keys(r).map(function (k) { r[k].length == 2; });

                if (homog.indexOf(false) < 0
                    && homog.length > 2) {

                    var mids = [];

                    var v = info.v.operator_multiply(cfg['gap-width']/2);

                    for (var k in r) {
                        var w = r[k][0][1].operator_subtract(pts[info.ids[0]]).operator_add(v);

                        mids.push({'k': k, 'x': w.getMagnitude()});
                    }

                    var l = info.l;
                    var n = Math.max(2, l/cfg['gap-min-dist']>>0);

                    var h = l/n/2;

                    var des = [];

                    var i2, j2;

                    for (i2 = 0; i2 < n; i2++) {
                        des.push(h+2*i2*h);
                    }

                    for (i2 = 0; i2 < n; i2++) {
                        var sn = [];
                        for (j2 = 0; j2 < mids.length; j2++) {
                            var d = Math.abs(mids[j2].x-des[i2]);

                            if (d < h+1e-5) {
                                sn.push([d, j2]);
                            }
                        }

                        sn.sort(function (a, b) { return a[0]-b[0]; });

                        for (j2 = 1; j2 < sn.length; j2++) {
                            delete r[mids[sn[j2][1]].k];
                        }

                    }

                }

                for (var k in r) {
                    q[k] = r[k];
                }
            } else {
                /* anzahl der ids ist ungerade
                wenn allerdings zwei ids/punkte fehlen, dann ist die anzahl trotzdem gerade
                -> führt zu einem fehler, den man aber sehen kann, wenn man sich das resultat ansieht
                */
            }
        }

    }

}

(function() {
    var before = Date.now();

    var doc = getDocument();
    var di = getDocumentInterface();

    var entities = doc.queryAllEntities();

    var layA = doc.queryLayer('Convex');
    if (isNull(layA)) {
        layA = AddLayer('Convex', 'Magenta');
    }

    var layB = doc.queryLayer('OBB');
    if (isNull(layB)) {
        layB = AddLayer('OBB', 'Blue');
    }

    var layC = doc.queryLayer(cfg['cutting-layer-name']);
    if (isNull(layC)) {
        layC = AddLayer(cfg['cutting-layer-name'], 'Black');
    }

    var layD = doc.queryLayer(cfg['engraving-layer-name']);

    var layE = doc.queryLayer('Markers');
    if (isNull(layE)) {
        layE = AddLayer('Markers', 'Lime');
    }

    var op = new RAddObjectsOperation(false);

    var i;

    for (i = 0; i < entities.length; i++) {
        var ent = doc.queryEntity(entities[i]);

        var layName = ent.getLayerName();

        if (layName == 'Offs' || layName == cfg['engraving-layer-name']) {

            if (layName == 'Offs'
                && ent.hasCustomProperty('lc-qcad', 'outside')) {

                var pl = ent.getData();

                var segs = pl.getExploded();
                var simplified = [];

                var pars = [];

                for (var j = 0; j < segs.length; j++) {
                    var seg = segs[j];

                    if (isArcShape(seg)) {
                        var apr = seg.approximateWithLines(1),
                            expl = apr.getExploded();

                        Array.prototype.push.apply(simplified, expl);

                        for (var k = 0; k < expl.length; k++) {
                            pars.push(j);
                        }
                    } else {
                        simplified.push(seg);
                        pars.push(j);
                    }
                }

                var pts = [];

                for (var j = 0; j < simplified.length; j++) {
                    pts.push(simplified[j].getStartPoint());
                }

                // konvexe hülle
                var cx = GetCX(pts);

                var cxPoly = new RPolyline(cx.map(function (id) { return pts[id]; }), true),
                    cxEnt = shapeToEntity(doc, cxPoly);

                // boundary-box
                var obb = GetOBB(pts, cx);

                var obbEnt = shapeToEntity(doc, obb[4]);

                var infos = GetInfos(pts, cx, obb);

                var R = {};

                var ratio = obb[1]/obb[2];

                ratio = Math.min(ratio, 1/ratio);

                var pairs = ['AC', 'BD'];

                var diag = obb[1]*obb[1]+obb[2]*obb[2];

                if (cfg['special-size-1'] > 1e-5
                    && obb[0] > Math.pow(cfg['special-size-1'], 2)) {

                    AddSideGaps(pts, infos, 'ABCD', R);

                } else {

                    if (diag < Math.pow(cfg['special-size-2'], 2)) {
                        try {
                            AddGaps(pts, infos.filter(function (info) { return info.real && info.l > 2; }).reduce(function (p, c) {
                                return p.l < c.l ? p : c;
                            }).ids, R, true);
                        } catch (e) {
                            // TypeError von reduce
                        }

                    } else {

                        if (ratio < .8) {
                            var sides = obb[2] > obb[1] ? pairs[0] : pairs[1];

                            if (ratio > .2) {
                                AddSideGaps(pts, infos, sides, R);
                            } else {
                                if (infos.some(function (info) { return info.side == sides[0] && info.ids.length > 2; })) {
                                    AddSideGaps(pts, infos, sides[0], R);

                                } else if (infos.some(function (info) { return info.side == sides[1] && info.ids.length > 2; })) {
                                    AddSideGaps(pts, infos, sides[1], R);

                                } else {
                                    // die langen seiten haben keine nasen
                                    AddSideGaps(pts, infos, pairs[(pairs.indexOf(sides)+1)%2], R);
                                }
                            }

                        } else {
                            AddSideGaps(pts, infos, 'ABCD', R);
                        }

                    }

                }

                var num = pts.length;

                var newSegs = [],
                    markers = [];

                if (Object.keys(R).length == 0) {
                    var dat = segs.map(function (s) {
                        if (isArcShape(s)) {
                            var r = s.getRadius(),
                                c = s.getCenter();
                            return [r.toFixed(4), c.x.toFixed(4), c.y.toFixed(4)].join(',');
                        } else {
                            return '-';
                        }
                    }).filter(function (itm, pos, ary) {
                        return !pos || itm != ary[pos-1];
                    });

                    if (dat.length == 1 && dat[0] != '-') {
                        var center = segs[0].getCenter(),
                            r = segs[0].getRadius();

                        var phi = Math.asin(cfg['gap-width']/(2*r));

                        var n = Math.max(1, 2*Math.PI*r/cfg['gap-min-dist']>>0);

                        var ang = 2*Math.PI/n;

                        for (var j = 0; j < n; j++) {
                            var k = (j+1)%n;

                            var angA = j*ang+phi,
                                angB = k*ang-phi;

                            var newArc = new RArc(center, r, angA, angB);

                            newSegs.push(newArc);

                            var v = new RVector(r, 0);
                            v.setAngle(j*ang);
                            markers.push(center.operator_add(v));
                        }
                    }

                }

                if (newSegs.length == 0) {
                    var used = [];

                    for (var j = 0; j < num; j++) {
                        if (R.hasOwnProperty(j)) {
                            Array.prototype.push.apply(newSegs, R[j].map(function (r) { return new RLine(r[0], r[1]); }));

                            R[j].slice(0, -1).forEach(function (r, idx) {
                                var nxt = R[j][idx+1];
                                markers.push(new RVector(r[1].x+.5*(nxt[0].x-r[1].x), r[1].y+.5*(nxt[0].y-r[1].y)));
                            });

                        } else {
                            if (used.indexOf(pars[j]) < 0) {
                                newSegs.push(segs[pars[j]].clone());

                                used.push(pars[j]);
                            }
                        }
                    }
                }

                for (var j = 0; j < newSegs.length; j++) {
                    var newEnt = shapeToEntity(doc, newSegs[j]);
                    newEnt.setLayerId(layC.getId());
                    op.addObject(newEnt, false);
                }

                if (cfg['add-markers']) {
                    for (var j = 0; j < markers.length; j++) {
                        var circ = new RCircle(markers[j], 1),
                            circEnt = shapeToEntity(doc, circ);

                        circEnt.setLayerId(layE.getId());
                        op.addObject(circEnt, false);
                    }
                }

                // darstellung

                cxEnt.setLayerId(layA.getId());
                obbEnt.setLayerId(layB.getId());

                op.addObject(cxEnt, false);
                op.addObject(obbEnt, false);

            } else {

                var expl = isPolylineEntity(ent) ? ent.getExploded() : [ent.castToShape()];

                for (var j = 0; j < expl.length; j++) {
                    var newEnt = shapeToEntity(doc, expl[j].clone());
                    newEnt.setLayerId(layName == cfg['engraving-layer-name'] ? layD.getId() : layC.getId());
                    op.addObject(newEnt, false);
                }

            }

            // testweise

            op.deleteObject(ent);

        }
    }

    di.applyOperation(op);

    qDebug((Date.now()-before)/1e3, 's');

})();
