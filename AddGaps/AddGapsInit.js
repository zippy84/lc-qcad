/* Copyright (c) 2018-2022, Ronald Römer
This source code is licensed under the MIT license found in the
LICENSE file in the root directory of this source tree.
*/

function init(basePath) {
    var action = new RGuiAction('AddGaps', RMainWindowQt.getMainWindow());
    action.setRequiresDocument(true);
    action.setScriptFile(basePath + '/AddGaps.js');
    action.setGroupSortOrder(100000);
    action.setSortOrder(0);
    action.setWidgetNames(['MiscModifyMenu']);
    action.setDefaultShortcut(new QKeySequence('a,g'));
}
