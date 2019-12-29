/* Copyright (c) 2018-2020, Ronald Römer
This source code is licensed under the MIT license found in the
LICENSE file in the root directory of this source tree.
*/

function AddLayer (name, color) {
    var doc = getDocument(),
        di = getDocumentInterface();

    var lay = new RLayer(doc, name, false, false, new RColor(color), doc.getLinetypeId('CONTINUOUS'), RLineweight.Weight000, false);

    var op = new RAddObjectOperation(lay, false, false);
    di.applyOperation(op);

    return lay;
}
