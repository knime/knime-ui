import roboto400 from "@fontsource/roboto-condensed/files/roboto-condensed-all-400-normal.woff";
import roboto700 from "@fontsource/roboto-condensed/files/roboto-condensed-all-700-normal.woff";

import { fileToBase64 } from "./fileToBase64";

const cache = new Map<number, string>();

const files = [
  { size: 400, filePath: roboto400 } as const,
  { size: 700, filePath: roboto700 } as const,
];

export const loadFontsAsBase64 = async () => {
  if (cache.size !== 0) {
    return Array.from(cache);
  }

  for (const { size, filePath } of files) {
    const fontBase64 = await fileToBase64(filePath);
    cache.set(size, fontBase64);
  }

  return Array.from(cache);
};
