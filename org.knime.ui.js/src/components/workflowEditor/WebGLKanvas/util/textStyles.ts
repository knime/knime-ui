/* eslint-disable no-magic-numbers */
import type { TextStyle } from "pixi.js";

import * as $colors from "@/style/colors";

type TextStylePreset = {
  downscalingFactor: number;
  styles: Partial<TextStyle> | TextStyle;
};

const defaultTextStyles: Partial<TextStyle> | TextStyle = {
  fontFamily: "Roboto Condensed",
  fill: $colors.text.default,
};

export const nodeNameText: TextStylePreset = {
  styles: {
    ...defaultTextStyles,
    fontSize: 32,
    fontWeight: "bold",
    wordWrap: true,
    // fixes slight cut off of some chars
    padding: 5,
    wordWrapWidth: 250,
    align: "center",
    textBaseline: "bottom",
  },
  downscalingFactor: 0.4,
};

export const nodeIdText: TextStylePreset = {
  styles: {
    ...defaultTextStyles,
    fontSize: 10 * 2.5,
    fontWeight: "normal",
    align: "center",
    textBaseline: "bottom",
  },
  downscalingFactor: 0.4,
};

export const nodeStateText: TextStylePreset = {
  styles: {
    ...defaultTextStyles,
    fontSize: 32,
    lineHeight: 9,
  },
  downscalingFactor: 0.25,
};
