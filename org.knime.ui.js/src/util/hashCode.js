/**
 * Returns a hash code from a string (java hashCode like)
 * @param  {String} str the string to hash
 * @return {Number}     32bit integer
 * @see https://stackoverflow.com/a/8831937
 */
export const hashCode = (str) => {
    let hash = 0;
    for (let i = 0, len = str.length; i < len; i++) {
        let chr = str.charCodeAt(i);
        // eslint-disable-next-line no-bitwise,no-magic-numbers
        hash = (hash << 5) - hash + chr;
        // eslint-disable-next-line no-bitwise
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};
