import type { TextStyle } from "pixi.js";

import * as $colors from "@/style/colors";

type TextStylePreset<T extends Record<string, any> = any> = T & {
  styles: Partial<TextStyle> | TextStyle;
};

const defaultTextStyles: Partial<TextStyle> | TextStyle = {
  fontFamily: "Roboto Condensed",
  fill: $colors.text.default,
};

const nodeRootFontSize = 12;
const nodeRootLineHeight = 1.15; // same as browser's default

export const nodeNameText: TextStylePreset<{
  basefontSize: number;
  baseLineHeight: number;
  maxLines: number;
}> = {
  basefontSize: nodeRootFontSize,
  baseLineHeight: nodeRootLineHeight,
  maxLines: 3,
  styles: {
    ...defaultTextStyles,
    fontSize: nodeRootFontSize,
    fontWeight: "bold",
    lineHeight: nodeRootFontSize * nodeRootLineHeight,
    wordWrap: true,
    wordWrapWidth: 90,
    breakWords: true,
    // fixes slight cut off of some chars
    padding: 2,
    align: "center",
  },
};

export const nodeLabelText: TextStylePreset<{
  baseFontSize: number;
  baseLineHeight: number;
  maxLines: number;
}> = {
  baseFontSize: nodeRootFontSize,
  baseLineHeight: nodeRootLineHeight,
  maxLines: 8,
  styles: {
    ...defaultTextStyles,
    fontSize: nodeRootFontSize,
    fontWeight: "normal",
    fontStyle: "normal",
    lineHeight: nodeRootFontSize * nodeRootLineHeight,
    wordWrap: true,
    wordWrapWidth: 170,
    breakWords: true,
    trim: true,
    whiteSpace: "pre",
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

export const connectorLabelText: TextStylePreset = {
  styles: {
    ...defaultTextStyles,
    fontSize: 12,
    fill: $colors.White,
  },
};

export const placeholderProgressText: TextStylePreset = {
  styles: {
    ...defaultTextStyles,
    fontSize: 10,
    align: "center",
    textBaseline: "middle",
    padding: 1,
  },
};
