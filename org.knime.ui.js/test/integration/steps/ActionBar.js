const { hover } = require('../plugins/locators');

// eslint-disable-next-line no-undef
const { I } = inject();

const actionBar = {
    executeNode(node) {
        I.click({ nodeId: node });
        I.click({ hover: hover.EXECUTE });
    },
    pauseNode(node) {
        I.click({ nodeId: node });
        I.click({ hover: hover.PAUSE });
    },
    stepNode(node) {
        I.click({ nodeId: node });
        I.click({ hover: hover.STEP });
    },
    resumeNode(node) {
        I.click({ nodeId: node });
        I.click({ hover: hover.RESUME });
    },
    cancelNode(node) {
        I.click({ nodeId: node });
        I.click({ hover: hover.CANCEL });
    },
    resetNode(node) {
        I.click({ nodeId: node });
        I.click({ hover: hover.RESET });
    }
};

module.exports = {
    actionBar
};
