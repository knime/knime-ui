import type { ITextStyle, TextStyle } from "pixi.js";

import * as $colors from "@/style/colors";

type TextStylePreset = {
  downscalingFactor: number;
  styles: Partial<ITextStyle> | TextStyle;
};

const defaultTextStyles: Partial<ITextStyle> | TextStyle = {
  fontFamily: "Roboto Condensed",
  fill: $colors.text.default,
};

export const nodeNameText: TextStylePreset = {
  styles: {
    ...defaultTextStyles,
    fontSize: 32,
    fontWeight: "bold",
    wordWrap: true,
    wordWrapWidth: 250,
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
