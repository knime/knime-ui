const inputElementTagNames = /^(input|textarea|select)$/i;

export const isInputElement = (target?: HTMLElement): boolean => {
    if (!target) {
        return false;
    }

    const isBlacklistedTag = inputElementTagNames.test(target.tagName);

    if (isBlacklistedTag || target.getAttribute?.('contenteditable') === 'true') {
        return true;
    }

    return false;
};
