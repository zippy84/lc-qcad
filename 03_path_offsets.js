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

    var offsLay = doc.queryLayer('Offs');

    if (isNull(offsLay)) {
        offsLay = AddLayer('Offs', 'Green');
    }

    var entities = doc.queryAllEntities();

    var op = new RAddObjectsOperation(false);

    for (var i = 0; i < entities.length; i++) {
        var ent = doc.queryEntity(entities[i]);

        if (isBlockReferenceEntity(ent)) {
            var itms = doc.queryBlockEntities(ent.getReferencedBlockId())
                .map(function (itm) { return doc.queryEntity(itm); })
                .filter(function (itm) { return isPolylineEntity(itm) && itm.isClosed() && itm.getLayerName() != cfg['engraving-layer-name']; });

            var filtered = [];

            var op2 = new RModifyObjectsOperation(false);

            for (var j = 0; j < itms.length; j++) {
                var itmA = itms[j],
                    shA = itmA.castToShape();

                var c = 0;

                for (var k = 0; k < itms.length; k++) {
                    if (j != k) {
                        var itmB = itms[k],
                            shB = itmB.castToShape();

                        if (shB.containsShape(shA)) {
                            c++;

                            break;
                        }
                    }

                }

                if (c > 0 ^ shA.getOrientation() == RS.CW) {
                    // richtung umkehren

                    itmA.reverse();
                    op2.addObject(itmA, false);
                }

                filtered.push(itmA);

            }

            di.applyOperation(op2);

            // mit workaround

            for (var j = 0; j < filtered.length; j++) {

                var expl = filtered[j].getExploded();

                for (var k = 0; k < expl.length; k++) {
                    var newPl = new RPolyline(expl);
                    newPl.convertToClosed();

                    if (cfg['cutting-width'] > 0) {

                        var worker = new RPolygonOffset(cfg['cutting-width']/2, 1, RVector.invalid, RS.JoinMiter, false);
                        worker.setForceSide(RS.RightHand);
                        worker.addPolyline(newPl);

                        var offs = worker.getOffsetShapes();

                        if (offs.length == 0) {
                            expl.push(expl.shift());

                        } else {

                            for (var k = 0; k < offs.length; k++) {
                                var off = shapeToEntity(doc, offs[k].data());

                                off.copyAttributesFrom(filtered[j].data());
                                off.setLayerId(offsLay.getId());

                                if (offs[k].getOrientation() == RS.CCW) {
                                    off.setCustomProperty('lc-qcad', 'outside', 1);
                                }

                                op.addObject(off, false);
                            }

                            break;
                        }

                    } else {
                        var off = shapeToEntity(doc, newPl);

                        off.copyAttributesFrom(filtered[j].data());
                        off.setLayerId(offsLay.getId());

                        if (newPl.getOrientation() == RS.CCW) {
                            off.setCustomProperty('lc-qcad', 'outside', 1);
                        }

                        op.addObject(off, false);

                        break;

                    }

                }

            }
        }
    }

    di.applyOperation(op);

    qDebug((Date.now()-before)/1e3, 's');

})();
