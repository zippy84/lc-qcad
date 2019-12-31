/* Copyright (c) 2018-2020, Ronald Römer
This source code is licensed under the MIT license found in the
LICENSE file in the root directory of this source tree.
*/

include('scripts/EAction.js');
include('scripts/WidgetFactory.js');

include('scripts/simple.js');

include('lcBundle.js');

function LaserCuttingFormatter (guiAction) {
    EAction.call(this, guiAction);

    this.enableOkButton = function (w, test) {
        if (test) {
            w.setStyleSheet('');
            this.okButton.setEnabled(!this.isLocked);
        } else {
            w.setStyleSheet('background: #ffaacc;');
            this.okButton.setEnabled(false);
        }
    }

    this.paperSizeSlot = function (val) {
        this.enableOkButton(this.widgets['PaperSize'], /^\d{2,4}x\d{2,4}$/.test(val));
    }

    this.engravingLayerNameSlot = function (val) {
        this.enableOkButton(this.widgets['EngravingLayerName'], val.length == 0 || !/^\s+|\s+$/.test(val));
    }

    this.cuttingLayerNameSlot = function (val) {
        this.enableOkButton(this.widgets['CuttingLayerName'], val.length == 0 || !/^\s+|\s+$/.test(val));
    }
}

LaserCuttingFormatter.prototype = new EAction();

LaserCuttingFormatter.includeBasePath = includeBasePath;

LaserCuttingFormatter.prototype.beginEvent = function () {
    EAction.prototype.beginEvent.call(this);

    var dialog = WidgetFactory.createWidget(LaserCuttingFormatter.includeBasePath, 'FormatterDialog.ui');

    WidgetFactory.restoreState(dialog);

    this.widgets = getWidgets(dialog);

    this.widgets['PaperSize'].textEdited.connect(this, 'paperSizeSlot');
    this.widgets['EngravingLayerName'].textEdited.connect(this, 'engravingLayerNameSlot');

    this.widgets['CuttingLayerName'].textEdited.connect(this, 'cuttingLayerNameSlot');

    var buttons = this.widgets['buttonBox'];
    this.okButton = buttons.button(QDialogButtonBox.Ok);

    var doc = getDocument();

    this.isLocked = doc.getVariable('isLocked', false);

    if (this.isLocked) {
        this.okButton.setEnabled(false);
    }

    if (!dialog.exec()) {
        dialog.destroy();
        EAction.activateMainWindow();
        this.terminate();
        return;
    }

    WidgetFactory.saveState(dialog);

    var userCfg = {
        'paper-size': this.widgets['PaperSize'].text.split('x').map(Number),
        'paper-padding': this.widgets['PaperPadding'].value,
        'engraving-layer-name': this.widgets['EngravingLayerName'].text,
        'cutting-layer-name': this.widgets['CuttingLayerName'].text,
        'cutting-width': this.widgets['CuttingWidth'].value,
        'packing-padding': this.widgets['PackingPadding'].value,
        'equal-sized-objects-dist': this.widgets['EqualSizedObjectsDist'].value,
        'gap-width': this.widgets['GapWidth'].value,
        'gap-min-dist': this.widgets['GapMinDist'].value,
        'special-size-1': this.widgets['SpecialSize1'].value,
        'special-size-2': this.widgets['SpecialSize2'].value,
        'extend-engraving': this.widgets['ExtendEngraving'].value,
        'del-tmp-layers': this.widgets['DelTmpLayers'].checked,
        'add-markers': this.widgets['AddMarkers'].checked
    };

    bundleFct(userCfg);
    doc.setVariable('isLocked', true);

    dialog.destroy();
    EAction.activateMainWindow();
    this.terminate();

};

LaserCuttingFormatter.init = function (basePath) {
    var action = new RGuiAction('Laser cutting formatter', RMainWindowQt.getMainWindow());
    action.setRequiresDocument(true);
    action.setScriptFile(basePath + '/LaserCuttingFormatter.js');

    action.setGroupSortOrder(80100);
    action.setSortOrder(200);
    action.setWidgetNames(['MiscModifyMenu']);
    action.setDefaultShortcut(new QKeySequence('l,c'));
};
