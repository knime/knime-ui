const blacklistTagNames = /^(input|textarea|select)$/i;

export const isInputElement = (e: KeyboardEvent): boolean => {
    const target = e.target as HTMLElement;
    if (!target) {
        return false;
    }
    console.log('target', target);
    console.log(target.getAttribute?.('contenteditable'));

    const isBlacklistedTag = blacklistTagNames.test(target.tagName);

    if (isBlacklistedTag || target.getAttribute?.('contenteditable') === 'true') {
        return true;
    }

    return false;
};
