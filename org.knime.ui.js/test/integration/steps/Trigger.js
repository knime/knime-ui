const { shortcut } = require('./Shortcut');
const { toolbar } = require('./Toolbar');
const { contextMenu } = require('./ContextMenu');
const { actionBar } = require('./ActionBar');

module.exports = {
    Trigger: {
        shortcut, toolbar, contextMenu, actionBar
    }
};
