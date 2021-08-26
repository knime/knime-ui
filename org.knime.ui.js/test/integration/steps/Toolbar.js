const { action } = require('../plugins/locators');

// eslint-disable-next-line no-undef
const { I } = inject();

const toolbar = {
    delete() {
        I.click({ action: action.DELETE });
    },
    undo() {
        I.click({ action: action.UNDO });
    },
    redo() {
        I.click({ action: action.REDO });
    },
    executeAll() {
        I.click({ action: action.EXECUTE_ALL });
    },
    executeNode(node) {
        I.click({ nodeId: node });
        I.click({ action: action.EXECUTE_NODE });
    },
    cancelNode(node) {
        I.click({ nodeId: node });
        I.click({ action: action.CANCEL_NODE });
    },
    resetNode(node) {
        I.click({ nodeId: node });
        I.click({ action: action.RESET_NODE });
    }
};

module.exports = {
    toolbar
};
