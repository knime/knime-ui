const { context } = require('../plugins/locators');

// eslint-disable-next-line no-undef
const { I } = inject();

const contextMenu = {
    executeNode(node) {
        I.rightClick({ nodeId: node });
        I.click({ context: context.EXECUTE });
    },
    pauseNode(node) {
        I.rightClick({ nodeId: node });
        I.click({ context: context.PAUSE });
    },
    stepNode(node) {
        I.rightClick({ nodeId: node });
        I.click({ context: context.STEP });
    },
    resumeNode(node) {
        I.rightClick({ nodeId: node });
        I.click({ context: context.RESUME });
    },
    deleteNode(node) {
        I.rightClick({ nodeId: node });
        I.click({ context: context.DELETE });
    },
    cancelNode(node) {
        I.rightClick({ nodeId: node });
        I.click({ context: context.CANCEL });
    }
};

module.exports = {
    contextMenu
};
