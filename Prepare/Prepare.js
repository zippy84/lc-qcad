/* Copyright (c) 2018-2022, Ronald Römer
This source code is licensed under the MIT license found in the
LICENSE file in the root directory of this source tree.
*/

include('scripts/EAction.js');
include('scripts/WidgetFactory.js');

function Prepare(guiAction) {
    EAction.call(this, guiAction);
}

Prepare.prototype = new EAction();

Prepare.includeBasePath = includeBasePath;

Prepare.prototype.beginEvent = function () {
    EAction.prototype.beginEvent.call(this);

    var dialog = WidgetFactory.createWidget(Prepare.includeBasePath, 'Prepare.ui');

    WidgetFactory.restoreState(dialog);

    if (!dialog.exec()) {
        dialog.destroy();
        EAction.activateMainWindow();
        this.terminate();
        return;
    }

    var widgets = getWidgets(dialog);

    var engravingLayerName = widgets['EngravingLayerName'].text,
        offset = widgets['Offset'].value;

    var indexFile = new QFile(Prepare.includeBasePath + '/index.js'),
        flags = new QIODevice.OpenMode(QIODevice.ReadOnly|QIODevice.Text);

    if (!indexFile.open(flags)) {}

    var textStream = new QTextStream(indexFile);

    textStream.setCodec('UTF-8');

    var contents = textStream.readAll();

    indexFile.close();

    try {
        var fct = new Function('argEngravingLayerName', 'argOffset', contents);
        fct(engravingLayerName, offset);
    } catch (e) {
        EAction.handleUserWarning(e.message);
    }

    WidgetFactory.saveState(dialog);

    dialog.destroy();
    EAction.activateMainWindow();
    this.terminate();
}
