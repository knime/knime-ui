const removeNonXMLChars = (xmlStr: string) => {
  // taken from https://www.w3.org/TR/REC-xml/#charsets
  const nonXMLChars =
    // eslint-disable-next-line no-control-regex
    /[\u0000-\u0008\u000B-\u000C\u000E-\u001F\uD800-\uDFFF]/gu;
  return xmlStr.replaceAll(nonXMLChars, "");
};

/**
 * Outputs the given SVG Element as a string
 * @param svg
 * @param skipLicense whether to add the license for the fonts
 * @returns serialized svg element
 */
export const generateSvgAsString = (svg: SVGElement, license?: string) => {
  // Get svg source
  const serializer = new XMLSerializer();
  let source = removeNonXMLChars(serializer.serializeToString(svg));

  // Add name spaces
  if (
    !source.match(
      /^<svg[^>]*?\sxmlns=(['"`])https?:\/\/www\.w3\.org\/2000\/svg\1/,
    )
  ) {
    source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (
    !source.match(
      /^<svg[^>]*?\sxmlns:xlink=(['"`])http:\/\/www\.w3\.org\/1999\/xlink\1/,
    )
  ) {
    source = source.replace(
      /^<svg/,
      '<svg xmlns:xlink="http://www.w3.org/1999/xlink"',
    );
  }

  // Add xml declaration
  source = `<?xml version="1.0" standalone="no"?>${
    license ? `\r\n${license}` : ""
  }\r\n${source}`;

  return source;
};
