/* Copyright (c) 2018-2023, Ronald Römer
This source code is licensed under the MIT license found in the
LICENSE file in the root directory of this source tree.
*/

import 'core-js/features/array/includes';

import 'core-js/features/typed-array/float64-array';
import 'core-js/features/typed-array/uint16-array';
import 'core-js/features/typed-array/uint32-array';

import 'core-js/features/object/entries';
import 'core-js/features/object/values';
import 'core-js/features/array/flat';

import 'core-js/features/object/assign';

import KDBush from 'kdbush';

const group = 10,
    _window = RMainWindowQt.getMainWindow();

try {

let di, doc, filePath;

const engravingLayerName = typeof argEngravingLayerName !== 'undefined' ? argEngravingLayerName : 'Gravur',
    offset = typeof argOffset !== 'undefined' ? argOffset : 0.05,
    skipInner = typeof argSkipInner !== 'undefined' ? argSkipInner : false;

if (_window !== null) {
    di = _window.getDocumentInterface();
    doc = di.getDocument();
} else {
    doc = new RDocument(new RMemoryStorage(), new RSpatialIndexNavel());
    di = new RDocumentInterface(doc);

    include('scripts/library.js');

    filePath = args[args.length-1];

    if (filePath) {
        di.importFile(filePath);

        // RDocumentInterface.IoErrorNoError
    }
}

const model = doc.getModelSpaceBlockId();

function addLayer(name, color) {
    const lay = new RLayer(doc, name, false, false, new RColor(color), doc.getLinetypeId('CONTINUOUS'), RLineweight.Weight000, false);

    const op = new RAddObjectOperation(lay, false);
    op.setTransactionGroup(group);

    di.applyOperation(op);

    return lay;
}

function setStyle(ent) {
    if (ent.getLayerName() !== engravingLayerName) {
        ent.setLayerId(newLay.getId());
    }
    ent.setLinetypeId(0);
    ent.setLineweight(RLineweight.WeightByLayer);
    ent.setColor(new RColor(RColor.ByLayer));
}

let newLay = doc.queryLayer('New');

if (isNull(newLay)) {
    newLay = addLayer('New', 'Cyan');
}

let engLay = doc.queryLayer(engravingLayerName);

if (isNull(engLay)) {
    engLay = addLayer(engravingLayerName, 'Red');
} else {
    engLay.setLineweight(RLineweight.Weight000);
    engLay.setColor(new RColor('Red'));
    engLay.setLinetypeId(doc.getLinetypeId('CONTINUOUS'));

    const op = new RModifyObjectOperation(engLay);
    op.setTransactionGroup(group);

    di.applyOperation(op);
}

let offLay = doc.queryLayer('Offset');

if (isNull(offLay)) {
    offLay = addLayer('Offset', 'Green');
}

const op = new RDeleteObjectsOperation(),
    all = doc.queryAllEntities(false, true);

op.setTransactionGroup(group);

for (const _ent of all) {
    const ent = doc.queryEntity(_ent);
    if (isDimensionEntity(ent) || isHatchEntity(ent) || isPointEntity(ent) || isXLineEntity(ent) || isRayEntity(ent) || isTextEntity(ent)) {
        op.deleteObject(ent);
    }
}

di.applyOperation(op);

const refs = doc.queryAllBlockReferences();

const op1 = new RAddObjectsOperation();
op1.setTransactionGroup(group);

const blocks = {},
    usedIds = [];

let t = 0;

for (const _ref of refs) {
    const ref = doc.queryEntity(_ref),
        blockId = ref.getReferencedBlockId(),
        block = doc.queryBlock(blockId);

    if (usedIds.includes(blockId)) {
        const newBlock = new RBlock(doc, 'Cpy' + t++, block.getOrigin());
        blocks[_ref] = newBlock;
        op1.addObject(newBlock, false);
    } else {
        blocks[_ref] = block;
        usedIds.push(blockId);
    }

}

di.applyOperation(op1);

const op2 = new RModifyObjectsOperation();
op2.setTransactionGroup(group);

// verschiebt die block-referenzen auf die 0 und kopiert mehrfach verwendete blöcke, sodass jede referenz auf eine kopie des blocks verweist

for (const _ref of refs) {
    const ref = doc.queryEntity(_ref),
        blockId = ref.getReferencedBlockId(),
        block = doc.queryBlock(blockId);

    const pos = ref.getPosition(),
        rot = ref.getRotation();

    const itms = doc.queryBlockEntities(blockId);

    const newId = blocks[_ref].getId();

    for (const _itm of itms) {
        const itm = doc.queryEntity(_itm),
            sh = itm.castToShape();

        if (blockId === newId) {
            itm.rotate(rot);
            itm.move(pos);

            setStyle(itm);

            op2.addObject(itm, false);

        } else {
            // kopiert

            const newItm = shapeToEntity(doc, sh.clone());
            newItm.setBlockId(newId);
            newItm.copyAttributesFrom(itm.data(), false);

            newItm.rotate(rot);
            newItm.move(pos);

            setStyle(newItm);

            op2.addObject(newItm, false);

        }

    }

    if (blockId !== newId) {
        ref.setReferencedBlockId(newId);
    }

    ref.setPosition(new RVector(0, 0));
    ref.setRotation(0);
    ref.setLayerId(doc.getLayer0Id());

    op2.addObject(ref, false);

}

di.applyOperation(op2);

// vereinheitlicht die attribute

const op3 = new RModifyObjectsOperation();
op3.setTransactionGroup(group);

const all2 = doc.queryAllEntities(false, false, [RS.EntityArc, RS.EntityLine, RS.EntityCircle, RS.EntityPolyline, RS.EntityEllipse]);

for (const _ent of all2) {
    const ent = doc.queryEntity(_ent);
    setStyle(ent);
    op3.addObject(ent, false);
}

di.applyOperation(op3);

// wandelt die circles in arcs um und löst die polylines auf

const op4 = new RAddObjectsOperation();
op4.setTransactionGroup(group);

const other = doc.queryAllEntities(false, true, [RS.EntityCircle, RS.EntityPolyline, RS.EntityEllipse]);

for (const _ent of other) {
    const ent = doc.queryEntity(_ent),
        sh = ent.castToShape();

    if (isCircleEntity(ent)) {
        const rad = sh.getRadius(),
            c = sh.getCenter();

        const arcA = new RArc(c, rad, 0, Math.PI),
            arcB = new RArc(c, rad, Math.PI, 2*Math.PI);

        const entA = shapeToEntity(doc, arcA),
            entB = shapeToEntity(doc, arcB);

        entA.copyAttributesFrom(ent.data());
        entB.copyAttributesFrom(ent.data());

        op4.addObject(entA, false);
        op4.addObject(entB, false);
        op4.deleteObject(ent);

    } else {
        const expls = [];

        if (isEllipseEntity(ent)) {
            const splines = sh.approximateWithSplines();

            for (const spline of splines) {
                expls.push(...spline.approximateWithArcs(.5).getExploded());
            }
        } else {
            expls.push(...sh.getExploded());
        }

        for (const expl of expls) {
            if (isLineShape(expl)) {
                const {startPoint, endPoint} = expl;

                if (startPoint.equalsFuzzy2D(endPoint, 1e-5)) {
                    continue;
                }
            }

            const newEnt = shapeToEntity(doc, expl.clone());
            newEnt.copyAttributesFrom(ent.data());
            op4.addObject(newEnt, false);
        }

        op4.deleteObject(ent);
    }

}

di.applyOperation(op4);

// löscht leere oder nicht verwendete blöcke

const op5 = new RDeleteObjectsOperation();
op5.setTransactionGroup(group);

const usedIds2 = [];

for (const _ref of refs) {
    const ref = doc.queryEntity(_ref);
    usedIds2.push(ref.getReferencedBlockId());
}

const blocks2 = doc.queryAllBlocks();

for (const block of blocks2) {
    if ((doc.queryBlockEntities(block).length === 0 || !usedIds2.includes(block))
        && block !== doc.getModelSpaceBlockId()) {
        op5.deleteObject(doc.queryBlock(block));
    }
}

di.applyOperation(op5);

// löscht leere layer

const op6 = new RDeleteObjectsOperation();
op6.setTransactionGroup(group);

const lays = doc.queryAllLayers();

for (const layId of lays) {
    if (doc.queryLayerEntities(layId, true).length === 0
        && layId !== doc.getLayer0Id()
        && ![newLay, engLay, offLay].map(lay => lay.getId()).includes(layId)) {
        op6.deleteObject(doc.queryLayer(layId));
    }
}

di.applyOperation(op6);

// duplikate löschen

const entities = doc.queryAllEntities(false, true);

const pts = [];

for (const entId of entities) {
    const ent = doc.queryEntity(entId);

    if (isArcEntity(ent) || isLineEntity(ent)) {
        if (ent.getLength() > 1e-5) {
            const ptA = ent.getStartPoint(),
                ptB = ent.getEndPoint();

            const layId = ent.getLayerId();

            pts.push({layId, entId, startPt: ptA, endPt: ptB, end: 0});
            pts.push({layId, entId, startPt: ptB, endPt: ptA, end: 1});
        }
    }
}

const tree = new KDBush(pts, p => p.startPt.x, p => p.startPt.y);

const dupls = {};

for (const p of pts) {
    if (typeof dupls[p.entId] === 'undefined') {
        const {x, y} = p.startPt;

        const nearest = tree.within(x, y, 1e-5);

        for (const id of nearest) {
            const near = pts[id];

            if (near.layId == p.layId
                && near.entId != p.entId
                && typeof dupls[near.entId] === 'undefined'
                && near.endPt.equalsFuzzy2D(p.endPt, 1e-5)) {

                const shA = doc.queryEntity(near.entId).castToShape(),
                    shB = doc.queryEntity(p.entId).castToShape();

                if (isArcShape(shA) && isArcShape(shB)) {
                    if (shA.equals(shB, 1e-5)) {
                        dupls[near.entId] = null;
                    }
                } else {
                    dupls[near.entId] = null;
                }
            }
        }
    }
}

const op7 = new RDeleteObjectsOperation();
op7.setTransactionGroup(group);

for (const dupl of Object.keys(dupls)) {
    op7.deleteObject(doc.queryEntity(parseInt(dupl)));
}

di.applyOperation(op7);

// legt ungenaue endpunkte zusammen

const pts2 = pts.filter(p => typeof dupls[p.entId] === 'undefined' && p.layId !== engLay.getId()),
    tree2 = new KDBush(pts2, p => p.startPt.x, p => p.startPt.y);

const skips = {},
    shapes = {};

for (const p of pts2) {
    if (typeof skips[p.entId] === 'undefined') {
        const {x, y} = p.startPt;

        const nearest = tree2.within(x, y, 1e-5);

        const found = nearest.filter(id => pts2[id].entId !== p.entId);

        if (found.length > 1) {
            di.selectEntities(nearest.map(id => pts2[id].entId));

            throw new Error('Ambiguous connection found.');

        } else if (found.length === 1) {
            const q = pts2[found[0]],
                ent = doc.queryEntity(q.entId),
                sh = ent.castToShape();

            if (typeof shapes[q.entId] === 'undefined') {
                shapes[q.entId] = sh.clone();
            }

            const _sh = shapes[q.entId];

            if (isLineShape(_sh)) {
                if (q.end === 0) {
                    _sh.setStartPoint(new RVector(x, y));
                } else {
                    _sh.setEndPoint(new RVector(x, y));
                }

            } else {
                // Arc
                let phi = _sh.getAngleLength()/2;

                const pt = q.end === 1 ? _sh.getStartPoint() : _sh.getEndPoint();

                const v = new RVector(pt.x-x, pt.y-y),
                    l = v.getMagnitude()/2;

                v.normalize();

                const d = l/Math.tan(phi);

                const f = (q.end === 0 ^ _sh.isReversed()) ? 1 : -1;

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

                _sh.setCenter(c);
                _sh.setRadius(r);

                if (q.end === 0) {
                    _sh.setStartAngle(angA);
                    _sh.setEndAngle(angB);
                } else {
                    _sh.setEndAngle(angA);
                    _sh.setStartAngle(angB);
                }
            }

            skips[q.entId] = null;
        }
    }
}

const op8 = new RModifyObjectsOperation();
op8.setTransactionGroup(group);

for (const id of Object.keys(shapes)) {
    const ent = doc.queryEntity(parseInt(id));
    ent.setShape(shapes[id]);

    op8.addObject(ent, false);
}

di.applyOperation(op8);

// lines zusammensetzen

function search(shapes, side, layId) {
    if (side === 'right') {
        const last = shapes[shapes.length-1],
            pt = last.shape.getEndPoint(),
            nearest = tree2.within(pt.x, pt.y, 1e-5);

        for (const id of nearest) {
            const near = pts2[id];

            if (near.entId !== last.entId
                && near.entId !== shapes[0].entId
                && layId === near.layId) {

                const ent = doc.queryEntity(near.entId),
                    sh = ent.castToShape().clone();

                if (near.end === 1) {
                    sh.reverse();
                }

                shapes.push({entId: near.entId, shape: sh});

                return true;

            }
        }
    } else {
        const first = shapes[0],
            pt = first.shape.getStartPoint(),
            nearest = tree2.within(pt.x, pt.y, 1e-5);

        for (const id of nearest) {
            const near = pts2[id];

            if (near.entId !== first.entId
                && near.entId !== shapes[shapes.length-1].entId
                && layId === near.layId) {

                const ent = doc.queryEntity(near.entId),
                    sh = ent.castToShape().clone();

                if (near.end === 0) {
                    sh.reverse();
                }

                shapes.unshift({entId: near.entId, shape: sh});

                return true;

            }
        }
    }

    return false;
}

const entities2 = pts2.map(p => p.entId);

const visited = {};

const op9 = new RAddObjectsOperation();
op9.setTransactionGroup(group);

for (const entId of entities2) {
    if (typeof visited[entId] === 'undefined') {
        const ent = doc.queryEntity(entId);

        const shapes = [{entId, shape: ent.castToShape().clone()}];

        while (search(shapes, 'right', ent.getLayerId())) {}
        while (search(shapes, 'left', ent.getLayerId())) {}

        shapes.forEach(sh => visited[sh.entId] = null);

        const newPl = new RPolyline(shapes.map(sh => sh.shape));

        const pl = shapeToEntity(doc, newPl);

        pl.copyAttributesFrom(ent.data());

        op9.addObject(pl, false);
    }
}

for (const id of Object.keys(visited)) {
    op9.deleteObject(doc.queryEntity(parseInt(id)));
}

di.applyOperation(op9);

// löscht zu kurze

const op10 = new RDeleteObjectsOperation();
op10.setTransactionGroup(group);

doc.queryAllEntities(false, true, [RS.EntityPolyline, RS.EntityLine, RS.EntityArc]).forEach(id => {
    const ent = doc.queryEntity(id);

    if (ent.getLength() < .01) {
        op10.deleteObject(ent);
    }
});

di.applyOperation(op10);

// löscht interner punkte

var op11 = new RMixedOperation();

doc.queryAllEntities(false, true, [RS.EntityPolyline]).forEach(id => {
    // qDebug('id', id);

    const ent = doc.queryEntity(id);

    const expl = ent.getExploded();

    const grps = [[]];

    expl.forEach(sh => {
        const last = grps[grps.length-1];

        if (last.length) {
            if (last[0].getShapeType() === sh.getShapeType()) {
                last.push(sh);
            } else {
                grps.push([sh]);
            }
        } else {
            last.push(sh);
        }
    });

    if (grps.length > 2) {
        if (isLineShape(expl[0]) && ent.isClosed()) {
            grps[0].unshift(...grps.pop());
        }
    }

    for (const grp of grps) {
        if (isLineShape(grp[0]) && grp.length > 1) {
            let pts = grp.map(line => line.getStartPoint());

            pts.push(grp[grp.length-1].getEndPoint());

            // qDebug(pts);

            if (grps.length === 1 && ent.isClosed()) {
                const vecs = pts.slice(1).map((k, i) => k.operator_subtract(pts[i]).normalize());

                vecs.unshift(vecs[vecs.length-1]);

                const angs = vecs.slice(1).map((k, i) => Math.acos(k.dot(vecs[i])));

                // qDebug(angs.join(', '));

                const ind = angs.indexOf(Math.max(...angs));

                // qDebug(ind);

                pts.pop();

                if (ind > 0) {
                    pts = pts.slice(ind).concat(pts.slice(0, ind));
                }

                // qDebug(pts);

                for (let i = pts.length-2; i > 0; i--) {
                    const j = i+1;

                    const v = pts[i].operator_subtract(pts[0]).normalize(),
                        n = new RVector(-v.y, v.x),
                        d = pts[0].dot(n);

                    if (Math.abs(pts[j].dot(n)-d) < 1e-5) {
                        pts.pop();
                    } else {
                        break;
                    }
                }

                // qDebug(pts);
            }

            const badInds = [];

            const pairs = [[0, pts.length-1]];

            while (pairs.length) {
                const [i, j] = pairs.shift();

                const pA = pts[i],
                    pB = pts[j];

                const v = pB.operator_subtract(pA).normalize();

                const n = new RVector(-v.y, v.x);

                const d = pA.dot(n);

                let maxDist = 0,
                    maxIndex = 0;

                for (let k = i+1; k < j; k++) {
                    const dist = Math.abs(pts[k].dot(n)-d);

                    if (dist > maxDist) {
                        maxDist = dist;
                        maxIndex = k;
                    }
                }

                if (maxDist > 1e-5) {
                    pairs.push([i, maxIndex]);
                    pairs.push([maxIndex, j]);
                } else {
                    for (let k = i+1; k < j; k++) {
                        badInds.push(k);
                    }
                }

            }

            badInds.sort((a, b) => b-a);

            // qDebug(badInds);

            const newPts = pts.slice();

            for (const ind of badInds) {
                newPts.splice(ind, 1);
            }

            if (grps.length === 1 && ent.isClosed()) {
                newPts.push(newPts[0]);
            }

            // qDebug('->', newPts);

            grp.length = 0;

            for (let i = 0; i < newPts.length-1; i++) {
                grp.push(new RLine(newPts[i], newPts[i+1]));
            }

        }
    }

    const newSh = new RPolyline(grps.flat()),
        newEnt = shapeToEntity(doc, newSh);

    newEnt.copyAttributesFrom(ent.data());

    op11.addObject(newEnt, false);

    op11.deleteObject(ent);

});

di.applyOperation(op11);

// gruppieren

const rects = [];

doc.queryAllEntities(false, false, RS.EntityPolyline).forEach(id => {
    const ent = doc.queryEntity(id);

    if (ent.isClosed() && ent.getLayerName() !== engravingLayerName) {
        rects.push(ent);
    }
});

const data = {};

rects.forEach(rect => {
    const rectId = rect.getId(),
        bb = rect.getBoundingBox().growXY(1e-5);

    const ids = doc.queryContainedEntitiesXY(bb);

    let rectSh = rect.castToShape();

    // workaround
    if (rectSh.hasArcSegments()) {
        rectSh = rectSh.convertArcToLineSegmentsLength(.5);
    }

    ids.forEach(id => {
        if (id !== rectId) {
            const ent = doc.queryEntityDirect(id),
                sh = ent.castToShape();

            if ((isPolylineShape(sh) && rectSh.containsShape(sh))
                || ((isLineShape(sh) || isArcShape(sh)) && sh.getEndPoints().every(pt => rectSh.contains(pt, true)))) {

                if (typeof data[rectId] === 'undefined') {
                    data[rectId] = [];
                }

                data[rectId].push(ent.getId());
            }

        }
    });

});

const parentIds = Object.keys(data).map(id => parseInt(id)),
    childIds = Object.values(data).flat();

const invalidIds = parentIds.filter(id => childIds.includes(id));

if (invalidIds.length) {
    di.selectEntities(invalidIds);

    throw new Error('Nesting detected.');
}

const allIds = parentIds.concat(childIds);

rects.forEach(rect => {
    const rectId = rect.getId();

    if (!allIds.includes(rectId)) {
        data[rectId] = [];
    }
});

// qDebug(JSON.stringify(data));

let i = 0;

for (const [parent, childs] of Object.entries(data)) {
    const parentId = parseInt(parent);

    const parentEnt = doc.queryEntityDirect(parentId);

    const position = parentEnt.getBoundingBox().getCorner1();

    const op = new RAddObjectsOperation(),
        block = new RBlock(doc, `Block${i++}`, new RVector(0, 0));

    op.setTransactionGroup(group);

    op.addObject(block, false);

    di.applyOperation(op);

    const blockId = block.getId();

    const op2 = new RModifyObjectsOperation();
    op2.setTransactionGroup(group);

    childs.unshift(parentId);

    for (const childId of childs) {
        const child = doc.queryEntity(childId);

        child.move(position.getNegated());

        child.setBlockId(blockId);
        op2.addObject(child, false);
    }

    di.applyOperation(op2);

    const op3 = new RAddObjectsOperation();
    op3.setTransactionGroup(group);

    const ref = new RBlockReferenceEntity(doc, new RBlockReferenceData(blockId, position, new RVector(1, 1), 0));

    op3.addObject(ref, false);

    di.applyOperation(op3);
}

// offset

const outerEnts = []; // wird nicht benötigt

const refs2 = doc.queryAllBlockReferences();

const op12 = new RAddObjectsOperation();
op12.setTransactionGroup(group);

for (const refId of refs2) {
    const ref = doc.queryEntity(refId);

    // qDebug(ref.getReferencedBlockName());

    const filtered = doc.queryBlockEntities(ref.getReferencedBlockId())
        .map(id => doc.queryEntity(id))
        .filter(ent => isPolylineEntity(ent) && ent.isClosed() && ent.getLayerName() !== engravingLayerName);

    const innerIds = [];

    const _op = new RModifyObjectsOperation();
    _op.setTransactionGroup(group);

    for (const ent of filtered) {
        const sh = ent.castToShape();

        let isInner = false;

        if (allIds.includes(ent.getId())) {
            isInner = childIds.includes(ent.getId());
        } else {
            for (const _ent of filtered) {
                if (ent !== _ent) {
                    const _sh = _ent.castToShape();

                    if (_sh.containsShape(sh)) {
                        isInner = true;
                        break;
                    }
                }
            }
        }

        if (isInner) {
            innerIds.push(ent.getId());
        }

        if (isInner ^ sh.getOrientation() === RS.CW) {
            // richtung umkehren

            ent.reverse();
            _op.addObject(ent, false);
        }
    }

    di.applyOperation(_op);

    // * mit workaround

    for (const ent of filtered) {
        const expl = ent.getExploded();

        for (let i = 0; i < expl.length; i++) {

            const newPl = new RPolyline(expl); // *
            newPl.convertToClosed();

            if (!(skipInner && innerIds.includes(ent.getId())) && offset > 0) {
                const worker = new RPolygonOffset(offset, 1, RVector.invalid, RS.JoinMiter, false);
                worker.setForceSide(RS.RightHand);
                worker.addPolyline(newPl);

                const offs = worker.getOffsetShapes();

                if (offs.length) {
                    for (const _off of offs) {
                        const off = shapeToEntity(doc, _off.data());

                        off.copyAttributesFrom(ent.data());
                        off.setLayerId(offLay.getId());

                        if (_off.getOrientation() === RS.CCW) {
                            outerEnts.push(off);
                        }

                        op12.addObject(off, false);
                    }

                    break;

                } else {
                    expl.push(expl.shift()); // *
                }

            } else {
                const off = shapeToEntity(doc, newPl);

                off.copyAttributesFrom(ent.data());
                off.setLayerId(offLay.getId());

                if (newPl.getOrientation() === RS.CCW) {
                    outerEnts.push(off);
                }

                op12.addObject(off, false);

                break;

            }

        }

    }
}

di.applyOperation(op12);

// outerEnts.forEach(ent => {
//     qDebug(ent.getId());
// });

// verschiebt auf die 0

const op13 = new RModifyObjectsOperation();
op13.setTransactionGroup(group);

doc.queryLayerEntities(newLay.getId()).forEach(id => {
    const ent = doc.queryEntityDirect(id);

    ent.setLayerId(doc.getLayer0Id());
    op13.addObject(ent, false);
});

di.applyOperation(op13);

// löst die blöcke auf

const refs3 = doc.queryAllBlockReferences();

const op14 = new RModifyObjectsOperation();
op14.setTransactionGroup(group);

for (const _ref of refs3) {
    const ref = doc.queryEntity(_ref),
        pos = ref.getPosition(),
        rot = ref.getRotation();

    const itms = doc.queryBlockEntities(ref.getReferencedBlockId());

    for (const _itm of itms) {
        const itm = doc.queryEntity(_itm);

        itm.setBlockId(model);
        itm.rotate(rot);
        itm.move(pos);

        op14.addObject(itm, false);
    }

    // löscht den block
    op14.deleteObject(doc.queryBlock(ref.getReferencedBlockId()));

}

di.applyOperation(op14);

// verschiebt auf die 0

const op15 = new RModifyObjectsOperation();
op15.setTransactionGroup(group);

doc.queryLayerEntities(offLay.getId()).forEach(id => {
    const ent = doc.queryEntityDirect(id);

    ent.setLayerId(doc.getLayer0Id());
    op15.addObject(ent, false);
});

di.applyOperation(op15);

// löscht layer

const _newLay = doc.queryLayer('New'),
    _offLay = doc.queryLayer('Offset');

const op16 = new RDeleteObjectsOperation();
op16.setTransactionGroup(group);

op16.deleteObject(_newLay);
op16.deleteObject(_offLay);
di.applyOperation(op16);

if (_window === null) {
    di.exportFile(filePath.replace(/([^\/]+)\.dxf$/, 'edited_$1.dxf'), 'DXF 2013');
    di.destroy();
}

} catch (err) {
    const {lineNumber} = err;

    qDebug(err);
    qDebug('line', lineNumber);

    if (_window !== null) {
        throw err;
    }
}
