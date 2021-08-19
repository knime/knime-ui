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
    }
};

module.exports = {
    shortcut
};
