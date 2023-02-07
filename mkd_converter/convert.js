/* Copyright (c) 2018-2023, Ronald Römer
This source code is licensed under the MIT license found in the
LICENSE file in the root directory of this source tree.
*/

include('scripts/library.js');

var doc = new RDocument(new RMemoryStorage(), new RSpatialIndexNavel());
var di = new RDocumentInterface(doc);

var fileIn = args[args.length-1];

qDebug(fileIn);

di.importFile(fileIn);

var info = new QFileInfo(fileIn);
var dir = info.absoluteDir();
dir.cd('out');

var fileOut = new QFileInfo(dir, info.baseName() + '_.dxf').filePath();

var entities = doc.queryLayerEntities(doc.queryLayer('Bemaßungen').getId(), true);

var filtered = [],
    arrows = [];

entities.forEach(function (id) {
    var ent = doc.queryEntityDirect(id),
        sh = ent.castToShape();

    if (isPolylineEntity(ent) && !sh.hasArcSegments()) {
        if (ent.isClosed()) {
            arrows.push(id);
        } else if (ent.countSegments() === 1) {
            filtered.push(id);
        }
    }
});

var lines = [],
    deferred = [];

arrows.forEach(function (id) {
    var connected = doc.queryConnectedEntities(id).filter(function (_id) {
        return filtered.indexOf(_id) !== -1;
    });

    if (connected.length) {
        Array.prototype.push.apply(lines, connected);
    } else {
        deferred.push(id);
    }
});

lines = lines.filter(function (v, i, a) { return a.indexOf(v) === i; });

lines = lines.map(function (id) {
    var line = doc.queryEntityDirect(id);

    line.setColor(new RColor('Red'));

    var op = new RModifyObjectOperation(line);
    di.applyOperation(op);
});

deferred.forEach(function (id) {
    var ent = doc.queryEntityDirect(id),
        sh = ent.castToShape(),
        expl = sh.getExploded();

    var lengths = expl.map(function (line) {
        return line.getLength();
    });

    var minLength = Math.min.apply(Math, lengths),
        index = lengths.indexOf(minLength);

    var middle = expl[index].getMiddlePoint();

    var tip = sh.getVertices().filter(function (pt) {
        return !pt.equalsFuzzy2D(expl[index].getStartPoint()) && !pt.equalsFuzzy2D(expl[index].getEndPoint());
    });

    tip = tip.pop();

    var box = new RBox(middle, 1, 1);

    var ids = doc.queryIntersectedEntitiesXY(box).filter(function (_id) {
        return filtered.indexOf(_id) !== -1;
    });

    if (ids.length === 1) {
        var line = doc.queryEntityDirect(ids[0]);

        var _sh = line.castToShape().getSegmentAt(0);

        var ptA = _sh.getStartPoint(),
            ptB = _sh.getEndPoint();

        var left = new RLine(tip, ptA),
            right = new RLine(tip, ptB);

        if (left.getDistanceFromStart(middle) > 0) {
            line.trimStartPoint(tip, tip);
        } else {
            // right.getDistanceFromStart(middle) > 0
            line.trimEndPoint(tip, tip);
        }

        line.setColor(new RColor('Red'));

        var op = new RModifyObjectOperation(line);
        di.applyOperation(op);
    }

});

filtered.forEach(function (id) {
    var ent = doc.queryEntityDirect(id);

    if (ent.getColor().red() === 255) {
        var line = ent.getSegmentAt(0);

        var pA = line.getStartPoint(),
            pB = line.getEndPoint();

        var v = pB.operator_subtract(pA).normalize();

        var q = new RVector(-2*v.y, 2*v.x),
            r = new RVector(2*v.y, -2*v.x);

        var n = new RVector(-v.y, v.x),
            d = n.dot(pA);

        var cands = [];

        [[pA, q], [pA, r], [pB, q], [pB, r]].forEach(function (dat) {
            var p = dat[0],
               w = dat[1];

            var _p = p.operator_add(w),
                box = new RBox(_p, 1, 1);

            var ids = doc.queryIntersectedEntitiesXY(box);

            ids.forEach(function (id) {
                var ent = doc.queryEntityDirect(id);
                if (isPolylineEntity(ent)) {
                    var sh = ent.castToShape(),
                        verts = sh.getVertices();

                    verts.forEach(function (vert, index) {
                        if (vert.equalsFuzzy2D(_p)) {
                            var end = index > 0 ? verts[0] : verts[1];

                            cands.push({start: vert, end: end});
                        }
                    });
                }
            });
        });

        if (cands.length) {
            var ptGrps = {};

            cands.forEach(function (cand) {
                var xS = cand.start.x.toFixed(5),
                    yS = cand.start.y.toFixed(5);

                var kS = xS + ',' + yS;

                if (typeof ptGrps[kS] === 'undefined') {
                    ptGrps[kS] = {};
                }

                var xE = cand.end.x.toFixed(5),
                    yE = cand.end.y.toFixed(5);

                var kE = xE + ',' + yE;

                ptGrps[kS][kE] = cand;
            });

            var _cands = [];

            Object.keys(ptGrps).forEach(function (kS) {
                Object.keys(ptGrps[kS]).forEach(function (kE) {
                    _cands.push(ptGrps[kS][kE]);
                });
            });

            var distGrps = {};

            _cands.forEach(function (cand) {
                var dist = n.dot(cand.end)-d;

                var k = dist.toFixed(5);

                if (typeof distGrps[k] === 'undefined') {
                    distGrps[k] = [];
                }

                distGrps[k].push(cand);
            });

            var pairs = Object.keys(distGrps).filter(function (k) {
                return distGrps[k].length === 2;
            });

            if (pairs.length === 1) {
                var data = new RDimAlignedData();

                data.setExtensionPoint1(distGrps[pairs[0]][0].end);
                data.setExtensionPoint2(distGrps[pairs[0]][1].end);
                data.setDefinitionPoint(pA);

                var dim = new RDimAlignedEntity(doc, data);

                var op = new RAddObjectOperation(dim);
                di.applyOperation(op);

                ent.setColor(new RColor('Blue'));

                var op = new RModifyObjectOperation(ent);
                di.applyOperation(op);

            } else {
                if (_cands.length === 2) {
                    var data = new RDimRotatedData();

                    data.setExtensionPoint1(_cands[0].end);
                    data.setExtensionPoint2(_cands[1].end);
                    data.setDefinitionPoint(pA);

                    if (line.isVertical()) {
                        data.setRotation(Math.PI/2);
                    }

                    var dim = new RDimRotatedEntity(doc, data);

                    var op = new RAddObjectOperation(dim);
                    di.applyOperation(op);

                    ent.setColor(new RColor('Blue'));

                    var op = new RModifyObjectOperation(ent);
                    di.applyOperation(op);

                }
            }

        }
    }
});

var textSize = 2.5; // mm

var dimx = [
    [RS.DIMTXT, 1.0],
    [RS.DIMEXE, 0.5],
    [RS.DIMEXO, 0.25],
    [RS.DIMGAP, 0.25],
    [RS.DIMASZ, 1.0],
    [RS.DIMDLI, 2.0]
];

dimx.forEach(function (dim) {
    doc.setKnownVariable(dim[0], textSize*dim[1]);
});

doc.setKnownVariable(RS.DIMSCALE, 1);
doc.setKnownVariable(RS.DIMZIN, 8);
doc.setKnownVariable(RS.DIMAZIN, 2);
doc.setKnownVariable(RS.DIMDSEP, 46); // .

doc.setKnownVariable(RS.DIMLUNIT, RS.Decimal);
doc.setKnownVariable(RS.DIMDEC, 4);

doc.setKnownVariable(RS.DIMAUNIT, RS.DegreesDecimal);
doc.setKnownVariable(RS.DIMADEC, 4);

var styles =  {
    '0.35_Schwarz': { 'hatch-color': '#606060' },
    '0.5mm': { 'hatch-color': '#66cc99' },
    '0.65mm': { 'hatch-color': '#00ccff' },
    '1mm': { 'hatch-color': '#66cccc' },
    '1.5mm': { 'hatch-color': '#ff6666' },
    '2mm': { 'hatch-color': '#e0e0e0' },
    '2mm_Grundplatte': { 'hatch-color': '#e0e0e0' },
    '3mm': { 'hatch-color': '#00ff00' },
    '1mm_Holz': { 'hatch-color': '#808080' },
    'Test': { 'hatch-color': '#ff0000' },
    'Türen': { 'hatch-color': '#61514e' },
    'Rot': { 'hatch-color': '#cc3300' },
    'Rot2': { 'hatch-color': '#cc3300' },
    'Fundament': { 'hatch-color': '#ccc4ba' },
    'Dach': { 'hatch-color': '#808080' },
    'Fachwerk': { 'hatch-color': '#3e2512' },
    'Fenster': { 'hatch-color': '#f2f2f2' },
    'Flächen': { 'hatch-color': '#00ffff' },
    'Ätzen_Rot': { 'hatch-color': '#ff0000' },
    'Ätzen_Grün': { 'hatch-color': '#00ff00' },
    'Ätzen_Schwarz': { 'hatch-color': '#000000' },
    'Fase vorne': { 'line-color': '#00ff00' },
    'Fase hinten': { 'line-color': '#ff00ff' },
    'Aufmaß': { 'line-color': '#0000ff' },
    'Zeichnung': { 'line-color': '#ff0000' },
    'Verzierung': { 'hatch-color': '#f2f2f2' },
    'Konstruktiv': { 'hatch-color': '#c0c0c0' },
    'Schindeln_Hintergrund': { 'hatch-color': '#f2f2f2' },

    // der vollständigkeit halber
    'Gravur': {},
    'Gravur_Rand': {},
    'Gravur_Schindeln': {},
    'Schwarz': {},
    'Schwarz2': {},
    'Ziegelung': {},
    'Schindeln': {},
    'Schindeln_2': {},
    'Schindeln_3': {},
};

// modfiziert die layer

var lays = doc.queryAllLayers();

lays.forEach(function (id) {
    var lay = doc.queryLayerDirect(id);

    lay.setOff(false);
    lay.setFrozen(false);
    lay.setLocked(false);
    lay.setPlottable(true);
    lay.setSnappable(true);

    lay.setLineweight(RLineweight.Weight025);
    lay.setLinetypeId(doc.getLinetypeId('CONTINUOUS'));

    var layName = lay.getName();

    if (typeof styles[layName] !== 'undefined'
        && typeof styles[layName]['line-color'] !== 'undefined') {
        lay.setColor(new RColor(styles[layName]['line-color']));
    } else {
        lay.setColor(new RColor('Black'));
    }

    var op = new RModifyObjectOperation(lay);
    di.applyOperation(op);
});

// attribute vereinheitlichen

var all = doc.queryAllEntities(false, true, [RS.EntityArc, RS.EntityLine, RS.EntityCircle, RS.EntityPolyline, RS.EntityEllipse]);

all.forEach(function (id) {
    var ent = doc.queryEntityDirect(id),
        layName = ent.getLayerName();

    if (layName !== 'Bemaßungen') {
        ent.setLineweight(RLineweight.WeightByLayer);
        ent.setColor(new RColor(RColor.ByLayer));

        var op = new RModifyObjectOperation(ent);
        di.applyOperation(op);
    }
});

var all = doc.queryAllEntities(false, true, [RS.EntityHatch]);

all.forEach(function (id) {
    var ent = doc.queryEntityDirect(id),
        layName = ent.getLayerName();

    if (typeof styles[layName] !== 'undefined'
        && typeof styles[layName]['hatch-color'] !== 'undefined') {

        ent.setLineweight(RLineweight.WeightByLayer);
        ent.setColor(new RColor(styles[layName]['hatch-color']));

        var op = new RModifyObjectOperation(ent);
        di.applyOperation(op);
    }

});

var redLines = filtered.filter(function (id) {
    var ent = doc.queryEntityDirect(id);
    return ent.getColor().red() === 255;
});

if (redLines.length === 0) {
    var op = new RDeleteObjectOperation(doc.queryLayer('Bemaßungen'));
    di.applyOperation(op);
}

// layer löschen

var op = new RDeleteObjectsOperation();

var lays = doc.queryAllLayers();

lays.forEach(function (id) {
    var lay = doc.queryLayer(id),
        layName = lay.getName();

    if (doc.queryLayerEntities(id, true).length === 0) {
        if (id !== doc.getLayer0Id()) {
            op.deleteObject(lay);
        }
    } else if (layName === 'Bemaßungen') {
        // op.deleteObject(lay);
    } else if (layName === 'Markierungen') {
        op.deleteObject(lay);
    } else if (typeof styles[layName] === 'undefined') {
        if (id !== doc.getLayer0Id()) {
            qDebug('->', layName);
        }
    }
});

di.applyOperation(op);

di.exportFile(fileOut, 'DXF 2013');
di.destroy();
