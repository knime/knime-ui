const inputElementTagNames = /^(input|textarea|select)$/i;

export const isInputElement = (target?: HTMLElement): boolean => {
  if (!target) {
    return false;
  }

  const isInputTag = inputElementTagNames.test(target.tagName);

  if (isInputTag || target.getAttribute?.("contenteditable") === "true") {
    return true;
  }

  return false;
};
