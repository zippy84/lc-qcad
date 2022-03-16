/* Copyright (c) 2018-2022, Ronald Römer
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

try {

const _window = RMainWindowQt.getMainWindow(),
    GROUP = 10;

let di, doc, filePath;

const engravingLayerName = typeof argEngravingLayerName !== 'undefined' ? argEngravingLayerName : 'Gravur',
    offset = typeof argOffset !== 'undefined' ? argOffset : 0.05;

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
    op.setTransactionGroup(GROUP);

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

function getAngle(a, b) {
    let ang = Math.atan2(a.x*b.y-b.x*a.y, a.x*b.x+a.y*b.y);
    if (ang < 0) {
        ang += 2*Math.PI;
    }
    return ang;
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
    op.setTransactionGroup(GROUP);

    di.applyOperation(op);
}

let offLay = doc.queryLayer('Offset');

if (isNull(offLay)) {
    offLay = addLayer('Offset', 'Green');
}

const op = new RDeleteObjectsOperation(),
    all = doc.queryAllEntities(false, true);

op.setTransactionGroup(GROUP);

for (const _ent of all) {
    const ent = doc.queryEntity(_ent);
    if (isDimensionEntity(ent) || isHatchEntity(ent) || isPointEntity(ent) || isXLineEntity(ent) || isRayEntity(ent) || isTextEntity(ent)) {
        op.deleteObject(ent);
    }
}

di.applyOperation(op);

const refs = doc.queryAllBlockReferences();

const op1 = new RAddObjectsOperation();
op1.setTransactionGroup(GROUP);

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
op2.setTransactionGroup(GROUP);

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
op3.setTransactionGroup(GROUP);

const all2 = doc.queryAllEntities(false, false, [RS.EntityArc, RS.EntityLine, RS.EntityCircle, RS.EntityPolyline, RS.EntityEllipse]);

for (const _ent of all2) {
    const ent = doc.queryEntity(_ent);
    setStyle(ent);
    op3.addObject(ent, false);
}

di.applyOperation(op3);

// wandelt die circles in arcs um und löst die polylines auf

const op4 = new RAddObjectsOperation();
op4.setTransactionGroup(GROUP);

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
op5.setTransactionGroup(GROUP);

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
op6.setTransactionGroup(GROUP);

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
        const ptA = ent.getStartPoint(),
            ptB = ent.getEndPoint();

        const layId = ent.getLayerId();

        pts.push({layId, entId, startPt: ptA, endPt: ptB, end: 0});
        pts.push({layId, entId, startPt: ptB, endPt: ptA, end: 1});
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

            if (near.entId != p.entId
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
op7.setTransactionGroup(GROUP);

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

        const found = nearest.filter(id => {
            const {entId, layId} = pts2[id];
            return entId !== p.entId && layId === p.layId;
        });

        if (found.length > 1) {
            throw new Error(`Ambiguous connection found at [${x}, ${y}].`);

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

                const ex = new RVector(1, 0);

                const angA = getAngle(ex, vA),
                    angB = getAngle(ex, vB);

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
op8.setTransactionGroup(GROUP);

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
op9.setTransactionGroup(GROUP);

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

// const _ids = doc.queryIntersectedEntitiesXY(new RBox(466, 452, 490, 464));
// qDebug(_ids);

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

    const rectSh = rect.castToShape();

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

const allIds = Object.keys(data).map(id => parseInt(id)).concat(Object.values(data).flat());

rects.forEach(rect => {
    const rectId = rect.getId();

    if (!allIds.includes(rectId)) {
        data[rectId] = [];
    }
});

qDebug(JSON.stringify(data));

let i = 0;

for (const [parent, childs] of Object.entries(data)) {
    const parentId = parseInt(parent);

    const parentEnt = doc.queryEntityDirect(parentId);

    const position = parentEnt.getBoundingBox().getCorner1();

    const op = new RAddObjectsOperation(),
        block = new RBlock(doc, `Block${i++}`, new RVector(0, 0));

    op.setTransactionGroup(GROUP);

    op.addObject(block, false);

    di.applyOperation(op);

    const blockId = block.getId();

    const op2 = new RModifyObjectsOperation();
    op2.setTransactionGroup(GROUP);

    childs.unshift(parentId);

    for (const childId of childs) {
        const child = doc.queryEntity(childId);

        child.move(position.getNegated());

        child.setBlockId(blockId);
        op2.addObject(child, false);
    }

    di.applyOperation(op2);

    const op3 = new RAddObjectsOperation();
    op3.setTransactionGroup(GROUP);

    const ref = new RBlockReferenceEntity(doc, new RBlockReferenceData(blockId, position, new RVector(1, 1), 0));

    op3.addObject(ref, false);

    di.applyOperation(op3);
}

// offset

const outerEnts = [];

const refs2 = doc.queryAllBlockReferences();

const op10 = new RAddObjectsOperation();
op10.setTransactionGroup(GROUP);

for (const refId of refs2) {
    const ref = doc.queryEntity(refId);

    // qDebug(ref.getReferencedBlockName());

    const itms = doc.queryBlockEntities(ref.getReferencedBlockId())
        .map(itm => doc.queryEntity(itm))
        .filter(itm => isPolylineEntity(itm) && itm.isClosed() && itm.getLayerName() !== engravingLayerName);

    const filtered = [];

    const _op = new RModifyObjectsOperation();
    _op.setTransactionGroup(GROUP);

    for (const itmA of itms) {
        let isInner = false;

        const shA = itmA.castToShape();

        for (const itmB of itms) {
            if (itmA !== itmB) {
                const shB = itmB.castToShape();

                if (shB.containsShape(shA)) {
                    isInner = true;

                    break;
                }
            }
        }

        if (isInner ^ shA.getOrientation() === RS.CW) {
            // richtung umkehren

            itmA.reverse();
            _op.addObject(itmA, false);
        }

        filtered.push(itmA);
    }

    di.applyOperation(_op);

    // * mit workaround

    for (const ent of filtered) {
        const expl = ent.getExploded();

        for (let i = 0; i < expl.length; i++) {

            const newPl = new RPolyline(expl); // *
            newPl.convertToClosed();

            if (offset > 0) {
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

                        op10.addObject(off, false);
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

                op10.addObject(off, false);

                break;

            }

        }

    }
}

di.applyOperation(op10);

// outerEnts.forEach(ent => {
//     qDebug(ent.getId());
// });

// verschiebt auf die 0

const op11 = new RModifyObjectsOperation();
op11.setTransactionGroup(GROUP);

doc.queryLayerEntities(newLay.getId()).forEach(id => {
    const ent = doc.queryEntityDirect(id);

    ent.setLayerId(doc.getLayer0Id());
    op11.addObject(ent, false);
});

di.applyOperation(op11);

// löst die blöcke auf

const refs3 = doc.queryAllBlockReferences();

const op12 = new RModifyObjectsOperation();
op12.setTransactionGroup(GROUP);

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

        op12.addObject(itm, false);
    }

    // löscht den block
    op12.deleteObject(doc.queryBlock(ref.getReferencedBlockId()));

}

di.applyOperation(op12);

// verschiebt auf die 0

const op13 = new RModifyObjectsOperation();
op13.setTransactionGroup(GROUP);

doc.queryLayerEntities(offLay.getId()).forEach(id => {
    const ent = doc.queryEntityDirect(id);

    ent.setLayerId(doc.getLayer0Id());
    op13.addObject(ent, false);
});

di.applyOperation(op13);

// löscht layer

const _newLay = doc.queryLayer('New'),
    _offLay = doc.queryLayer('Offset');

const op14 = new RDeleteObjectsOperation();
op14.setTransactionGroup(GROUP);

op14.deleteObject(_newLay);
op14.deleteObject(_offLay);
di.applyOperation(op14);

if (_window === null) {
    di.exportFile(filePath.replace(/([^\/]+)\.dxf$/, 'edited_$1.dxf'), 'DXF 2013');
    di.destroy();
}

} catch(err) {
    const {lineNumber} = err;

    qDebug(err);
    qDebug('line', lineNumber);
}
