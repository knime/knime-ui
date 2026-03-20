import type { Graphics } from "pixi.js";

import type { PrecomputedGlow } from "./_internalGlow";
import { getPerimeterPoint } from "./_internalPerimeter";
import { wrapToUnit } from "./_internalUtil";
import type { BorderGeometry } from "./types";

export type BorderResources = {
  geometry: BorderGeometry;
  colorLookupTable: Uint32Array;
  strokeWidth: number;
};

/**
 * Draws the gradient border onto the given Graphics instance.
 *
 * Each segment looks up its colour from the LUT at (midT − rotationFraction).
 */
export const drawBorder = (
  target: Graphics,
  rotationFraction: number,
  { geometry, colorLookupTable, strokeWidth }: BorderResources,
): void => {
  const colorLookupMaxIndex = colorLookupTable.length - 1;

  // colour each segment according to the rotation fraction
  for (const segment of geometry.segments) {
    const color =
      colorLookupTable[
        Math.round(
          wrapToUnit(segment.midT - rotationFraction) * colorLookupMaxIndex,
        )
      ];
    if (segment.kind === "line") {
      target.moveTo(segment.startX, segment.startY);
      target.lineTo(segment.endX, segment.endY);
    } else {
      target.arc(
        segment.centerX,
        segment.centerY,
        segment.insetRadius,
        segment.sliceStart,
        segment.sliceEnd,
        false,
      );
    }
    target.stroke({ width: strokeWidth, color, cap: "butt" });
  }

  // Fill the four outer-corner notch patches (sharp corners only)
  if (geometry.kind === "sharp") {
    const halfStroke = strokeWidth / 2;
    for (const { cornerT, patchX, patchY } of geometry.cornerPatches) {
      const color =
        colorLookupTable[
          Math.round(
            wrapToUnit(cornerT - rotationFraction) * colorLookupMaxIndex,
          )
        ];
      target.rect(patchX, patchY, halfStroke, halfStroke);
      target.fill(color);
    }
  }
};

/**
 * Draws the glow dot cluster onto the given Graphics instance.
 */
export const drawGlowDots = (
  target: Graphics,
  rotationFraction: number,
  glow: PrecomputedGlow,
): void => {
  const rotatedAnchorT = wrapToUnit(glow.anchorT + rotationFraction);

  for (const { perimeterOffset, radius, alpha } of glow.dots) {
    const dotPosition = wrapToUnit(rotatedAnchorT + perimeterOffset);
    const [pointX, pointY] = getPerimeterPoint(dotPosition, glow.perimeter);
    target.circle(pointX, pointY, radius);
    target.fill({ color: glow.color, alpha });
  }
};

/**
 * Draws the interior cutout rectangle in erase mode to get rid of the glow inside
 * the border.
 */
export const drawGlowCutout = (
  target: Graphics,
  strokeWidth: number,
  width: number,
  height: number,
  borderRadius: number,
): void => {
  const cutoutX = strokeWidth;
  const cutoutY = strokeWidth;
  const cutoutWidth = width - 2 * strokeWidth;
  const cutoutHeight = height - 2 * strokeWidth;
  if (borderRadius > 0) {
    const innerRadius = Math.max(0, borderRadius - strokeWidth);
    target.roundRect(cutoutX, cutoutY, cutoutWidth, cutoutHeight, innerRadius);
  } else {
    target.rect(cutoutX, cutoutY, cutoutWidth, cutoutHeight);
  }
  const fillColor = 0xffffff;
  target.fill(fillColor);
};
