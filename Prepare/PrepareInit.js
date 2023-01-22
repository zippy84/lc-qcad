/* Copyright (c) 2018-2023, Ronald Römer
This source code is licensed under the MIT license found in the
LICENSE file in the root directory of this source tree.
*/

function init(basePath) {
    var action = new RGuiAction('Prepare', RMainWindowQt.getMainWindow());
    action.setRequiresDocument(true);
    action.setScriptFile(basePath + '/Prepare.js');
    action.setGroupSortOrder(100000); // ?
    action.setSortOrder(0); // ?
    action.setWidgetNames(['MiscModifyMenu']);
    action.setDefaultShortcut(new QKeySequence('p,d'));
}
