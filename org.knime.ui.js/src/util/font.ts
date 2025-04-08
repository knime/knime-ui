import roboto400Italic from "@fontsource/roboto-condensed/files/roboto-condensed-all-400-italic.woff";
import roboto400Normal from "@fontsource/roboto-condensed/files/roboto-condensed-all-400-normal.woff";
import roboto700Italic from "@fontsource/roboto-condensed/files/roboto-condensed-all-700-italic.woff";
import roboto700Normal from "@fontsource/roboto-condensed/files/roboto-condensed-all-700-normal.woff";

import { fileToBase64 } from "./fileToBase64";

const files = {
  roboto400Italic: {
    filePath: roboto400Italic,
    fontWeight: 400,
    fontStyle: "italic",
  },
  roboto700Italic: {
    filePath: roboto700Italic,
    fontWeight: 700,
    fontStyle: "italic",
  },
  roboto400Normal: {
    filePath: roboto400Normal,
    fontWeight: 400,
    fontStyle: "normal",
  },
  roboto700Normal: {
    filePath: roboto700Normal,
    fontWeight: 700,
    fontStyle: "normal",
  },
} as const;

const cache = new Map<
  keyof typeof files,
  { fontData: string; fontWeight: number; fontStyle: "italic" | "normal" }
>();

export const getCachedFontsAsBase64 = () => {
  return cache;
};

export const preloadFontsAsBase64 = async () => {
  if (cache.size !== 0) {
    return cache;
  }

  for (const [fileName, { filePath, fontWeight, fontStyle }] of Object.entries(
    files,
  )) {
    const fontBase64 = await fileToBase64(filePath);
    cache.set(fileName, { fontData: fontBase64, fontWeight, fontStyle });
  }

  return cache;
};
