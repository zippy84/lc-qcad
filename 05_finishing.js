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

    var blocks = doc.queryAllBlockReferences();
    var model = doc.getModelSpaceBlockId();

    // löst die blöcke auf

    var op = new RModifyObjectsOperation();

    for (var i = 0; i < blocks.length; i++) {
        var b = doc.queryEntity(blocks[i]);
        var pos = b.getPosition();
        var rot = b.getRotation();

        if (b.getReferencedBlockName() == 'BB') {
            continue;
        }

        var itms = doc.queryBlockEntities(b.getReferencedBlockId());

        for (var j = 0; j < itms.length; j++) {
            var itm = doc.queryEntity(itms[j]);
            itm.setBlockId(model);
            itm.rotate(rot);
            itm.move(pos);

            op.addObject(itm, false);
        }

        // löscht den block
        op.deleteObject(doc.queryBlock(b.getReferencedBlockId()));

    }

    di.applyOperation(op);

    di.flushTransactions();

    qDebug((Date.now()-before)/1e3, 's');

})();
