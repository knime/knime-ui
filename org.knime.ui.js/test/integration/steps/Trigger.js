const { shortcut } = require('./Shortcut');
const { toolbar } = require('./Toolbar');
const { contextMenu } = require('./ContextMenu');

module.exports = {
    // TODO: test Windows/Linux
    Trigger: {
        shortcut, toolbar, contextMenu
    }
};
