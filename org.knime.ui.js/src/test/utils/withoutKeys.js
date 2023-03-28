/* returns a new object that does not contain the keys given in keys array */
export const withoutKeys = (object, keys) => Object.fromEntries(
    Object.entries(object).filter(([prop]) => !keys.includes(prop))
);
