const { action } = require('../plugins/locators');

// eslint-disable-next-line no-undef
const { I } = inject();

// TODO: test Windows/Linux
const toolbar = {
    delete() {
        I.click({ action: action.DELETE });
    },
    undo() {
        I.click({ action: action.UNDO });
    },
    redo() {
        I.click({ action: action.REDO });
    }
};

module.exports = {
    toolbar
};
