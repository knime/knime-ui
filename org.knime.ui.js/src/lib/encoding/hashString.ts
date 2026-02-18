/* eslint-disable no-bitwise */
/* eslint-disable no-magic-numbers */
/**
 * Generates a 32-bit FNV-1a hash of the input string.
 *
 * This is a non-cryptographic hash suitable for short cache keys or identifiers.
 * It returns a deterministic 8-character hexadecimal string.
 *
 * See:
 * https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
 *
 * @returns The 32-bit hash as a zero-padded hex string (e.g., "7f8a2b3c").
 */
export const hashString = (input: string) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};
