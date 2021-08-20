// eslint-disable-next-line no-undef
const { I } = inject();

// TODO: test Windows/Linux
const shortcut = {
    delete() {
        I.pressKey('Delete');
    },
    undo() {
        I.pressKey(['CommandOrControl', 'Z']);
    },
    redo() {
        I.pressKey(['CommandOrControl', 'Shift', 'Z']);
    },
    executeNode(id) {
        I.click({ nodeId: id });
        I.pressKey('F7');
    },
    cancelNode(id) {
        I.click({ nodeId: id });
        I.pressKey('F9');
    },
    resetNode(id) {
        I.click({ nodeId: id });
        I.pressKey('F8');
    },
    executeMultipleNodes(...id) {
        I.selectMultipleNodes(...id);
        I.pressKey('F7');
    },
    cancelMultipleNodes(...id) {
        I.selectMultipleNodes(...id);
        I.pressKey('F9');
    },
    resetMultipleNodes(...id) {
        I.selectMultipleNodes(...id);
        I.pressKey('F8');
    },
    executeAll() {
        I.pressKey(['Shift', 'F7']);
    },
    cancelAll() {
        I.pressKey(['Shift', 'F9']);
    },
    resetAll() {
        I.pressKey(['Shift', 'F8']);
    }
};

module.exports = {
    shortcut
};
