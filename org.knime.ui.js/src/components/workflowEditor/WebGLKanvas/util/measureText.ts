import type { TextStyle } from "pixi.js";
import * as PIXI from "pixi.js";

export const measureText = (
  text: string,
  style: Partial<TextStyle> | TextStyle,
) => {
  return PIXI.CanvasTextMetrics.measureText(
    text,
    new PIXI.TextStyle(style),
    undefined, // eslint-disable-line no-undefined
    true,
  );
};
