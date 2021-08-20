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
    }
};

module.exports = {
    actionBar
};
