const { context } = require('../plugins/locators');

// eslint-disable-next-line no-undef
const { I } = inject();

// TODO: test Windows/Linux
const contextMenu = {
    deleteNode(node) {
        I.rightClick({ nodeId: node });
        I.click({ context: context.DELETE });
    }
};

module.exports = {
    contextMenu
};
