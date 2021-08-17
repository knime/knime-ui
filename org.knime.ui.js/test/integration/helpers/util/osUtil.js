const _getModifierKey = () => {
    const modifierKey = process.platform === 'darwin' ? 'Meta' : 'Control';
    return modifierKey;
};

module.exports = {
    _getModifierKey
};
