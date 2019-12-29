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

    var layA = doc.queryLayer('New');
    if (isNull(layA)) {
        layA = AddLayer('New', 'Cyan');
    }

    function SetStyle (itm) {
        if (itm.getLayerName() != cfg['engraving-layer-name']) {
            itm.setLayerId(layA.getId());
        }
        itm.setLinetypeId(0);
        itm.setLineweight(RLineweight.WeightByLayer);
        itm.setColor(new RColor(RColor.ByLayer));
    }

    var op = new RDeleteObjectsOperation(false);

    var all = doc.queryAllEntities(false, true);

    for (var i = 0; i < all.length; i++) {
        var ent = doc.queryEntity(all[i]);
        if (isDimensionEntity(ent) || isHatchEntity(ent) || isPointEntity(ent) || isXLineEntity(ent) || isRayEntity(ent) || isTextEntity(ent)) {
            op.deleteObject(ent);
        }
    }

    di.applyOperation(op);

    var op = new RModifyObjectsOperation(false);

    var layB = doc.queryLayer(cfg['engraving-layer-name']);

    if (!isNull(layB)) {
        layB.setLineweight(RLineweight.Weight000);
        layB.setColor(new RColor('Red'));

        op.addObject(layB, false);
    }

    di.applyOperation(op);

    var refs = doc.queryAllBlockReferences();

    var op = new RAddObjectsOperation(false);

    var blocks = {},
        usedIds = [],
        t = 0;

    for (var i = 0; i < refs.length; i++) {
        var ref = doc.queryEntity(refs[i]),
            blockId = ref.getReferencedBlockId(),
            block = doc.queryBlock(blockId);

        if (usedIds.indexOf(blockId) < 0) {
            blocks[refs[i]] = block;
            usedIds.push(blockId);
        } else {
            var newBlock = new RBlock(doc, 'Cpy' + t, block.getOrigin());
            blocks[refs[i]] = newBlock;
            op.addObject(newBlock, false);
            t++;
        }

    }

    di.applyOperation(op);

    var op = new RModifyObjectsOperation(false);

    // verschiebt die block-referenzen auf die 0 und kopiert mehrfach verwendete blöcke, sodass jede referenz auf eine kopie des blocks verweist

    for (var i = 0; i < refs.length; i++) {
        var ref = doc.queryEntity(refs[i]),
            blockId = ref.getReferencedBlockId(),
            block = doc.queryBlock(blockId);

        var pos = ref.getPosition(),
            rot = ref.getRotation();

        var itms = doc.queryBlockEntities(blockId);

        var newId = blocks[refs[i]].getId();

        for (var j = 0; j < itms.length; j++) {
            var itm = doc.queryEntity(itms[j]),
                sh = itm.castToShape();

            if (blockId == newId) {
                itm.rotate(rot);
                itm.move(pos);

                SetStyle(itm);

                op.addObject(itm, false);

            } else {
                // kopiert

                var newItm = shapeToEntity(doc, sh.clone());
                newItm.setBlockId(newId);
                newItm.copyAttributesFrom(itm.data(), false);

                newItm.rotate(rot);
                newItm.move(pos);

                SetStyle(newItm);

                op.addObject(newItm, false);

            }

        }

        if (blockId != newId) {
            ref.setReferencedBlockId(newId);
        }

        ref.setPosition(new RVector(0, 0));
        ref.setRotation(0);
        ref.setLayerId(doc.getLayer0Id());

        op.addObject(ref, false);

    }

    di.applyOperation(op);

    // vereinheitlicht die attribute

    var op = new RModifyObjectsOperation(false);

    var all = doc.queryAllEntities(false, false, [RS.EntityArc, RS.EntityLine, RS.EntityCircle, RS.EntityPolyline, RS.EntityEllipse]);

    for (var i = 0; i < all.length; i++) {
        var ent = doc.queryEntity(all[i]);
        SetStyle(ent);
        op.addObject(ent, false);
    }

    di.applyOperation(op);

    // wandelt die circles in arcs um und löst die polylines auf

    var op = new RAddObjectsOperation(false);

    var other = doc.queryAllEntities(false, true, [RS.EntityCircle, RS.EntityPolyline, RS.EntityEllipse]);

    for (var i = 0; i < other.length; i++) {
        var ent = doc.queryEntity(other[i]),
            sh = ent.castToShape();

        if (isCircleEntity(ent)) {

            var rad = sh.getRadius(),
                c = sh.getCenter();

            var arcA = new RArc(c, rad, 0, Math.PI),
                arcB = new RArc(c, rad, Math.PI, 2*Math.PI);

            var entA = shapeToEntity(doc, arcA),
                entB = shapeToEntity(doc, arcB);

            entA.copyAttributesFrom(ent.data());
            entB.copyAttributesFrom(ent.data());

            op.addObject(entA, false);
            op.addObject(entB, false);
            op.deleteObject(ent);

        } else {
            var expl = [];

            if (isEllipseEntity(ent)) {
                var splines = sh.approximateWithSplines();

                for (var j = 0; j < splines.length; j++) {
                    Array.prototype.push.apply(expl, splines[j].approximateWithArcs(.5).getExploded());
                }
            } else {
                expl = sh.getExploded();
            }

            for (var j = 0; j < expl.length; j++) {
                var newEnt = shapeToEntity(doc, expl[j].clone());
                newEnt.copyAttributesFrom(ent.data());
                op.addObject(newEnt, false);
            }

            op.deleteObject(ent);
        }

    }

    di.applyOperation(op);

    // löscht kurze linien

    var op = new RDeleteObjectsOperation(false);

    var lines = doc.queryAllEntities(false, true, RS.EntityLine);

    for (var i = 0; i < lines.length; i++) {
        var ent = doc.queryEntity(lines[i]),
            sh = ent.castToShape();

        if (sh.getLength() < 1e-2) {
            op.deleteObject(ent);
        }

    }

    di.applyOperation(op);

    // löscht leere oder nicht genutzte blöcke

    var op = new RDeleteObjectsOperation(false);

    var usedIds = [];

    for (var i = 0; i < refs.length; i++) {
        var ref = doc.queryEntity(refs[i]);
        usedIds.push(ref.getReferencedBlockId());
    }

    var blocks = doc.queryAllBlocks();

    for (var i = 0; i < blocks.length; i++) {
        if ((doc.queryBlockEntities(blocks[i]).length == 0 || usedIds.indexOf(blocks[i]) < 0)
            && blocks[i] != doc.getModelSpaceBlockId()) {
            op.deleteObject(doc.queryBlock(blocks[i]));
        }
    }

    di.applyOperation(op);

    // löscht leere layer

    var op = new RDeleteObjectsOperation(false);

    var lays = doc.queryAllLayers();

    for (var i = 0; i < lays.length; i++) {
        if (doc.queryLayerEntities(lays[i], true).length == 0
            && lays[i] != doc.getLayer0Id()) {
            op.deleteObject(doc.queryLayer(lays[i]));
        }
    }

    di.applyOperation(op);

    qDebug((Date.now()-before)/1e3, 's');

})();
