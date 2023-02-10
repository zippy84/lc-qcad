/* Copyright (c) 2018-2023, Ronald Römer
This source code is licensed under the MIT license found in the
LICENSE file in the root directory of this source tree.
*/

import 'core-js/features/array/includes';
import 'core-js/features/object/assign';

import 'core-js/features/typed-array/float64-array';
import 'core-js/features/typed-array/uint16-array';
import 'core-js/features/typed-array/uint32-array';

import KDBush from 'kdbush';

include('scripts/library.js');

const doc = new RDocument(new RMemoryStorage(), new RSpatialIndexNavel());
const di = new RDocumentInterface(doc);

const fileIn = args[args.length-1];

di.importFile(fileIn);

const info = new QFileInfo(fileIn);
const dir = info.absoluteDir();
dir.cd('out');

const fileName = info.baseName();

qDebug('->', fileName);

const fileOut = new QFileInfo(dir, fileName + '_.dxf').filePath();

const styles =  {
    '0.35_Schwarz': { 'hatch-color': '#606060' },
    '0.5mm': { 'hatch-color': '#66cc99' },
    '0.65mm': { 'hatch-color': '#00ccff' },
    '1mm': { 'hatch-color': '#66cccc' },
    '1mm_Fenster': { 'hatch-color': '#ff99cc' },
    '1.5mm': { 'hatch-color': '#ff6666' },
    '2mm': { 'hatch-color': '#e0e0e0' }, // '#ff0066'
    '2mm_Grundplatte': { 'hatch-color': '#e0e0e0' },
    '3mm': { 'hatch-color': '#00ff00' },
    '1mm_Holz': { 'hatch-color': '#808080' },
    'Test': { 'hatch-color': '#ff0000' },
    'Türen': { 'hatch-color': '#61514e' },
    'Tür': { 'line-color': '#00ff00' },
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
    'Dach_Druck': { 'hatch-color': '#007fff' },
    'Schild': { 'hatch-color': '#000000' },

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

const lays = doc.queryAllLayers();

lays.forEach(id => {
    const lay = doc.queryLayerDirect(id);

    lay.setOff(false);
    lay.setFrozen(false);
    lay.setLocked(false);
    lay.setPlottable(true);
    lay.setSnappable(true);

    lay.setLineweight(RLineweight.Weight025);
    lay.setLinetypeId(doc.getLinetypeId('CONTINUOUS'));

    const layName = lay.getName();

    if (typeof styles[layName] !== 'undefined'
        && typeof styles[layName]['line-color'] !== 'undefined') {
        lay.setColor(new RColor(styles[layName]['line-color']));
    } else {
        lay.setColor(new RColor('Black'));
    }

    const op = new RModifyObjectOperation(lay);
    di.applyOperation(op);
});

// erstellt bemaßungen

const entities = doc.queryLayerEntities(doc.queryLayer('Bemaßungen').getId(), true);

const filtered = [],
    arrows = [];

entities.forEach(id => {
    const ent = doc.queryEntityDirect(id),
        sh = ent.castToShape();

    if (isPolylineEntity(ent) && !sh.hasArcSegments()) {
        if (ent.isClosed()) {
            arrows.push(id);
        } else if (ent.countSegments() === 1) {
            filtered.push(id);
        }
    }
});

let lines = [];

const deferred = [];

arrows.forEach(id => {
    const connected = doc.queryConnectedEntities(id).filter(_id => {
        return filtered.includes(_id);
    });

    if (connected.length) {
        Array.prototype.push.apply(lines, connected);
    } else {
        deferred.push(id);
    }
});

lines = lines.filter((v, i, a) => { return a.indexOf(v) === i; });

lines = lines.map(id => {
    const line = doc.queryEntityDirect(id);

    line.setColor(new RColor('Red'));

    const op = new RModifyObjectOperation(line);
    di.applyOperation(op);
});

deferred.forEach(id => {
    const ent = doc.queryEntityDirect(id),
        sh = ent.castToShape(),
        expl = sh.getExploded();

    const lengths = expl.map(line => {
        return line.getLength();
    });

    const minLength = Math.min.apply(Math, lengths),
        index = lengths.indexOf(minLength);

    const middle = expl[index].getMiddlePoint();

    let tip = sh.getVertices().filter(pt => {
        return !pt.equalsFuzzy2D(expl[index].getStartPoint()) && !pt.equalsFuzzy2D(expl[index].getEndPoint());
    });

    tip = tip.pop();

    const box = new RBox(middle, 1, 1);

    const ids = doc.queryIntersectedEntitiesXY(box).filter(_id => {
        return filtered.includes(_id);
    });

    if (ids.length === 1) {
        const line = doc.queryEntityDirect(ids[0]);

        const _sh = line.castToShape().getSegmentAt(0);

        const ptA = _sh.getStartPoint(),
            ptB = _sh.getEndPoint();

        const left = new RLine(tip, ptA),
            right = new RLine(tip, ptB);

        if (left.getDistanceFromStart(middle) > 0) {
            line.trimStartPoint(tip, tip);
        } else {
            // right.getDistanceFromStart(middle) > 0
            line.trimEndPoint(tip, tip);
        }

        line.setColor(new RColor('Red'));

        const op = new RModifyObjectOperation(line);
        di.applyOperation(op);
    }

});

filtered.forEach(id => {
    const ent = doc.queryEntityDirect(id);

    if (ent.getColor().red() === 255) {
        const line = ent.getSegmentAt(0);

        const pA = line.getStartPoint(),
            pB = line.getEndPoint();

        const v = pB.operator_subtract(pA).normalize();

        const q = new RVector(-2*v.y, 2*v.x),
            r = new RVector(2*v.y, -2*v.x);

        const n = new RVector(-v.y, v.x),
            d = n.dot(pA);

        const cands = [];

        [[pA, q], [pA, r], [pB, q], [pB, r]].forEach(dat => {
            const p = dat[0],
               w = dat[1];

            const _p = p.operator_add(w),
                box = new RBox(_p, 1, 1);

            const ids = doc.queryIntersectedEntitiesXY(box);

            ids.forEach(id => {
                const ent = doc.queryEntityDirect(id);
                if (isPolylineEntity(ent)) {
                    const sh = ent.castToShape(),
                        verts = sh.getVertices();

                    verts.forEach((vert, index) => {
                        if (vert.equalsFuzzy2D(_p)) {
                            const end = index > 0 ? verts[0] : verts[1];

                            cands.push({start: vert, end: end});
                        }
                    });
                }
            });
        });

        if (cands.length) {
            const ptGrps = {};

            cands.forEach(cand => {
                const xS = cand.start.x.toFixed(5),
                    yS = cand.start.y.toFixed(5);

                const kS = xS + ',' + yS;

                if (typeof ptGrps[kS] === 'undefined') {
                    ptGrps[kS] = {};
                }

                const xE = cand.end.x.toFixed(5),
                    yE = cand.end.y.toFixed(5);

                const kE = xE + ',' + yE;

                ptGrps[kS][kE] = cand;
            });

            const _cands = [];

            Object.keys(ptGrps).forEach(kS => {
                Object.keys(ptGrps[kS]).forEach(kE => {
                    _cands.push(ptGrps[kS][kE]);
                });
            });

            const distGrps = {};

            _cands.forEach(cand => {
                const dist = n.dot(cand.end)-d;

                const k = dist.toFixed(5);

                if (typeof distGrps[k] === 'undefined') {
                    distGrps[k] = [];
                }

                distGrps[k].push(cand);
            });

            const pairs = Object.keys(distGrps).filter(k => {
                return distGrps[k].length === 2;
            });

            if (pairs.length === 1) {
                const data = new RDimAlignedData();

                data.setExtensionPoint1(distGrps[pairs[0]][0].end);
                data.setExtensionPoint2(distGrps[pairs[0]][1].end);
                data.setDefinitionPoint(pA);

                const dim = new RDimAlignedEntity(doc, data);

                const op = new RAddObjectOperation(dim);
                di.applyOperation(op);

                ent.setColor(new RColor('Blue'));

                const op2 = new RModifyObjectOperation(ent);
                di.applyOperation(op2);

            } else {
                if (_cands.length === 2) {
                    const data = new RDimRotatedData();

                    data.setExtensionPoint1(_cands[0].end);
                    data.setExtensionPoint2(_cands[1].end);
                    data.setDefinitionPoint(pA);

                    if (line.isVertical()) {
                        data.setRotation(Math.PI/2);
                    }

                    const dim = new RDimRotatedEntity(doc, data);

                    const op = new RAddObjectOperation(dim);
                    di.applyOperation(op);

                    ent.setColor(new RColor('Blue'));

                    const op2 = new RModifyObjectOperation(ent);
                    di.applyOperation(op2);

                }
            }

        }
    }
});

const textSize = 2.5; // mm

const dimx = [
    [RS.DIMTXT, 1.0],
    [RS.DIMEXE, 0.5],
    [RS.DIMEXO, 0.25],
    [RS.DIMGAP, 0.25],
    [RS.DIMASZ, 1.0],
    [RS.DIMDLI, 2.0]
];

dimx.forEach(dim => {
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

// schilder (sehr speziell)

let blocks = [];

doc.queryAllBlockReferences().forEach(id => {
    const ent = doc.queryEntityDirect(id),
        layName = ent.getLayerName(),
        blockId = ent.getReferencedBlockId();

    if (layName === 'Schild') {
        blocks.push(blockId);
    }
});

blocks = blocks.filter((v, i, a) => { return a.indexOf(v) === i; });

blocks.forEach(blockId => {
    const entities = doc.queryBlockEntities(blockId);

    const data = [];

    entities.forEach(_id => {
        const ent = doc.queryEntityDirect(_id);

        if (isHatchEntity(ent)) {
            const bbox = ent.getBoundingBox(),
                area = bbox.getWidth()*bbox.getHeight();

            const dat = {ent: ent, lines: [], bbox: bbox, area: area};

            for (let i = 0; i < ent.getLoopCount(); i++) {
                const shapes = ent.getLoopBoundary(i);

                const pl = new RPolyline(shapes);

                dat.lines.push(pl);
            }

            data.push(dat);
        }
    });

    data.sort((a, b) => { return b.area-a.area; });

    // qDebug(data.map(dat => { return dat.area; } ));

    const lines = [];

    if (data[0].lines.length === 1) {
        const a = data.shift(),
            b = data.shift();

        const op = new RDeleteObjectsOperation();
        op.deleteObject(a.ent);
        op.deleteObject(b.ent);
        di.applyOperation(op);

        const hatchData = new RHatchData();
        hatchData.newLoop()
        hatchData.addBoundary(a.lines[0]);
        hatchData.newLoop()
        hatchData.addBoundary(b.lines[0]);

        const hatch = new RHatchEntity(doc, hatchData);
        hatch.setBlockId(blockId);
        hatch.setLayerName('Schild');

        const op2 = new RAddObjectOperation(hatch, false);
        di.applyOperation(op2);

        lines.push(a.lines[0]);
        lines.push(b.lines[0]);

    } else if (data[0].lines.length === 2) {
        const op = new RDeleteObjectOperation(data[1].ent);
        di.applyOperation(op);

        data.splice(1, 1);
    }

    data.forEach(dat => {
        Array.prototype.push.apply(lines, dat.lines);
    });

    const op = new RAddObjectsOperation();

    lines.forEach(line => {
        const _line = shapeToEntity(doc, line);
        _line.setBlockId(blockId);
        _line.setLayerName('Schild');
        op.addObject(_line, false);
    });

    di.applyOperation(op);

    const op2 = new RModifyObjectsOperation();

    data.forEach(dat => {
        dat.ent.setLayerName('Schild');
        op2.addObject(dat.ent, false);
    });

    di.applyOperation(op2);
});

// attribute vereinheitlichen

const all = doc.queryAllEntities(false, true, [RS.EntityArc, RS.EntityLine, RS.EntityCircle, RS.EntityPolyline, RS.EntityEllipse]);

all.forEach(id => {
    const ent = doc.queryEntityDirect(id),
        layName = ent.getLayerName();

    if (layName !== 'Bemaßungen') {
        ent.setLineweight(RLineweight.WeightByLayer);
        ent.setColor(new RColor(RColor.ByLayer));

        const op = new RModifyObjectOperation(ent);
        di.applyOperation(op);
    }
});

const all2 = doc.queryAllEntities(false, true, [RS.EntityHatch]);

all2.forEach(id => {
    const ent = doc.queryEntityDirect(id),
        layName = ent.getLayerName();

    if (typeof styles[layName] !== 'undefined'
        && typeof styles[layName]['hatch-color'] !== 'undefined') {

        ent.setLineweight(RLineweight.WeightByLayer);
        ent.setColor(new RColor(styles[layName]['hatch-color']));

        const op = new RModifyObjectOperation(ent);
        di.applyOperation(op);
    }

});

// vereinfacht die polylines (auch in hatches)

function simplifyPolyline(pl) {
    const pts = [];

    const shapes = pl.getExploded().filter(shape => shape.getLength() > 1e-5).map(shape => shape.clone());

    shapes.forEach((sh, shapeId) => {
        if (isArcShape(sh) || isLineShape(sh)) {
            const ptA = sh.getStartPoint(),
                ptB = sh.getEndPoint();

            pts.push({shapeId, startPt: ptA, endPt: ptB, end: 0});
            pts.push({shapeId, startPt: ptB, endPt: ptA, end: 1});
        }
    });

    const tree = new KDBush(pts, p => p.startPt.x, p => p.startPt.y);

    const skips = {};

    for (const p of pts) {
        if (typeof skips[p.shapeId] === 'undefined') {
            const {x, y} = p.startPt;

            const nearest = tree.within(x, y, 1e-5);

            const found = nearest.filter(id => pts[id].shapeId !== p.shapeId);

            if (found.length > 1) {
                throw new Error(`Ambiguous connection found near (${x}, ${y}).`);

            } else if (found.length === 1) {
                const q = pts[found[0]],
                    sh = shapes[q.shapeId];

                if (isLineShape(sh)) {
                    if (q.end === 0) {
                        sh.setStartPoint(new RVector(x, y));
                    } else {
                        sh.setEndPoint(new RVector(x, y));
                    }

                } else {
                    // Arc
                    let phi = sh.getAngleLength()/2;

                    const pt = q.end === 1 ? sh.getStartPoint() : sh.getEndPoint();

                    const v = new RVector(pt.x-x, pt.y-y),
                        l = v.getMagnitude()/2;

                    v.normalize();

                    const d = l/Math.tan(phi);

                    const f = (q.end === 0 ^ sh.isReversed()) ? 1 : -1;

                    const c = new RVector(x+l*v.x-f*d*v.y, y+l*v.y+f*d*v.x);

                    const vA = new RVector(x-c.x, y-c.y),
                        vB = new RVector(pt.x-c.x, pt.y-c.y);

                    const r = vA.getMagnitude();

                    vA.normalize();
                    vB.normalize();

                    let angA = Math.atan2(vA.y, vA.x);
                    if (angA < 0) {
                        angA += 2*Math.PI;
                    }

                    let angB = Math.atan2(vB.y, vB.x);
                    if (angB < 0) {
                        angB += 2*Math.PI;
                    }

                    sh.setCenter(c);
                    sh.setRadius(r);

                    if (q.end === 0) {
                        sh.setStartAngle(angA);
                        sh.setEndAngle(angB);
                    } else {
                        sh.setEndAngle(angA);
                        sh.setStartAngle(angB);
                    }
                }

                skips[q.shapeId] = null;
            }
        }
    }

    return shapes;
}

let deletedShapes = 0;

const all3 = doc.queryAllEntities(false, true, [RS.EntityPolyline, RS.EntityHatch]);

all3.forEach(id => {
    const ent = doc.queryEntityDirect(id),
        layName = ent.getLayerName(),
        blockId = ent.getBlockId();

    if (isPolylineEntity(ent)) {
        const pl = ent.castToShape();

        try {
            const shapes = simplifyPolyline(pl);
            ent.setShape(new RPolyline(shapes));

            const op = new RModifyObjectOperation(ent);
            di.applyOperation(op);

            deletedShapes += pl.countSegments()-shapes.length;
        } catch (err) {
            qDebug('->', err.message, `layer ${layName}`);
        }
    } else {
        const hatchData = new RHatchData();

        for (let i = 0; i < ent.getLoopCount(); i++) {
            const pl = new RPolyline(ent.getLoopBoundary(i));

            try {
                const shapes = simplifyPolyline(pl);

                hatchData.newLoop();
                hatchData.addBoundary(new RPolyline(shapes));

                deletedShapes += pl.countSegments()-shapes.length;
            } catch (err) {
                qDebug('->', err.message, `layer ${layName}`);

                hatchData.newLoop();
                hatchData.addBoundary(pl);
            }
        }

        const hatch = new RHatchEntity(doc, hatchData);
        hatch.setBlockId(blockId);
        hatch.copyAttributesFrom(ent.data(), false);

        const op = new RMixedOperation();
        op.addObject(hatch, false);
        op.deleteObject(ent);
        di.applyOperation(op);
    }

});

const all4 = doc.queryAllEntities(false, true, [RS.EntityLine, RS.EntityArc]);

all4.forEach(id => {
    const ent = doc.queryEntityDirect(id);

    if (ent.getLength() < 1e-5) {
        const op = new RDeleteObjectOperation(ent);
        di.applyOperation(op);

        deletedShapes++;
    }
});

qDebug('->', deletedShapes);

// löscht die alten bemaßungen

const redLines = filtered.filter(id => {
    const ent = doc.queryEntityDirect(id);
    return ent.getColor().red() === 255;
});

if (redLines.length === 0) {
    const op = new RDeleteObjectOperation(doc.queryLayer('Bemaßungen'));
    di.applyOperation(op);
}

// layer löschen

const op = new RDeleteObjectsOperation();

lays.forEach(id => {
    const lay = doc.queryLayer(id),
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
