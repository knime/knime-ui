import type { TextStyle } from "pixi.js";

import * as $colors from "@/style/colors";

type TextStylePreset = {
  styles: Partial<TextStyle> | TextStyle;
};

const defaultTextStyles: Partial<TextStyle> | TextStyle = {
  fontFamily: "Roboto Condensed",
  fill: $colors.text.default,
};

export const nodeNameText: TextStylePreset = {
  styles: {
    ...defaultTextStyles,
    fontSize: 12,
    fontWeight: "bold",
    wordWrap: true,
    breakWords: true,
    // fixes slight cut off of some chars
    padding: 2,
    wordWrapWidth: 90,
    align: "center",
  },
};

export const nodeLabelText: TextStylePreset = {
  styles: {
    ...defaultTextStyles,
    fontSize: 12,
    fontWeight: "normal",
    whiteSpace: "pre",
    // fixes slight cut off of some chars
    padding: 2,
    align: "center",
  },
};

export const nodeIdText: TextStylePreset = {
  styles: {
    ...defaultTextStyles,
    fontSize: 10,
    padding: 2,
    fontWeight: "normal",
    align: "center",
    textBaseline: "bottom",
  },
};

export const nodeStateText: TextStylePreset = {
  styles: {
    ...defaultTextStyles,
    fontSize: 8,
    lineHeight: 9,
  },
};
