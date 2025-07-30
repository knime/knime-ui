import type { TextStyle } from "pixi.js";

import * as $colors from "@/style/colors";

type TextStylePreset<T extends Record<string, any> = any> = T & {
  styles: Partial<TextStyle> | TextStyle;
};

const defaultTextStyles: Partial<TextStyle> | TextStyle = {
  fontFamily: "Roboto Condensed",
  fill: $colors.text.default,
};

const nodeFontSize = 12;
const nodeLineHeight = 1.15;

export const nodeNameText: TextStylePreset<{
  fontSize: number;
  lineHeight: number;
  maxLines: number;
}> = {
  fontSize: nodeFontSize,
  lineHeight: nodeLineHeight,
  maxLines: 3,
  styles: {
    ...defaultTextStyles,
    fontSize: nodeFontSize,
    fontWeight: "bold",
    lineHeight: nodeFontSize * nodeLineHeight,
    wordWrap: true,
    wordWrapWidth: 90,
    breakWords: true,
    // fixes slight cut off of some chars
    padding: 2,
    align: "center",
  },
};

export const nodeLabelText: TextStylePreset<{
  lineHeight: number;
  maxLines: number;
}> = {
  lineHeight: nodeLineHeight,
  maxLines: 8,
  styles: {
    ...defaultTextStyles,
    fontSize: nodeFontSize,
    fontWeight: "normal",
    lineHeight: nodeFontSize * nodeLineHeight,
    wordWrap: true,
    wordWrapWidth: 150,
    breakWords: true,
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
  },
};
