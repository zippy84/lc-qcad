/* Copyright (c) 2018-2023, Ronald Römer
This source code is licensed under the MIT license found in the
LICENSE file in the root directory of this source tree.
*/

var doc = new RDocument(new RMemoryStorage(), new RSpatialIndexNavel());
var di = new RDocumentInterface(doc);

di.importFile(args[1]);

if (args[2] !== '1') {
    var f = parseInt(args[2]);

    var op = new RModifyObjectsOperation();

    doc.queryAllEntities(false, false, [RS.EntityDimAligned, RS.EntityDimRotated]).forEach(function (id) {
        var dim = doc.queryEntity(id);

        dim.setLinearFactor(f);

        op.addObject(dim, false);
    });

    di.applyOperation(op);
}

doc.setKnownVariable(RS.DIMTSZ, 2.5);

di.exportFile(args[1], 'DXF 2013');
di.destroy();
