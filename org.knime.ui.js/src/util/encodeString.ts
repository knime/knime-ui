export const encodeString = (stringValue: string) => {
  // See:
  // https://stackoverflow.com/questions/30106476/using-javascripts-atob-to-decode-base64-doesnt-properly-decode-utf-8-strings
  // convert a Unicode string to a string in which
  // each 16-bit unit occupies only one byte
  const toBinary = (string: string) => {
    const codeUnits = new Uint16Array(string.length);
    for (let i = 0; i < codeUnits.length; i++) {
      codeUnits[i] = string.charCodeAt(i);
    }
    return btoa(String.fromCharCode(...new Uint8Array(codeUnits.buffer)));
  };

  return toBinary(stringValue);
};
