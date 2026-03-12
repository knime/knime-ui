/* eslint-disable max-params */
import { wrapToUnit } from "@/lib/math";
import type { GraphicsInst } from "@/vue3-pixi";

import type { BorderGeometry, GlowDot } from "./types";

/**
 * Draws the gradient border onto the given Graphics instance.
 *
 * Each segment looks up its colour from the LUT at (midT − rotationFraction).
 */
export const drawBorder = (
  graphics: GraphicsInst,
  geometry: BorderGeometry,
  rotationFraction: number,
  colorLookupTable: Uint32Array,
  strokeWidth: number,
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
      graphics.moveTo(segment.startX, segment.startY);
      graphics.lineTo(segment.endX, segment.endY);
    } else {
      graphics.arc(
        segment.centerX,
        segment.centerY,
        segment.insetRadius,
        segment.sliceStart,
        segment.sliceEnd,
        false,
      );
    }
    graphics.stroke({ width: strokeWidth, color, cap: "butt" });
  }

  // Fill the four outer-corner notch patches
  if (geometry.kind === "sharp") {
    const halfStroke = strokeWidth / 2;
    for (const { cornerT, patchX, patchY } of geometry.cornerPatches) {
      const color =
        colorLookupTable[
          Math.round(
            wrapToUnit(cornerT - rotationFraction) * colorLookupMaxIndex,
          )
        ];
      graphics.rect(patchX, patchY, halfStroke, halfStroke);
      graphics.fill(color);
    }
  }
};

/**
 * Draws the glow dot cluster onto the given Graphics instance.
 */
export const drawGlowDots = (
  graphics: GraphicsInst,
  dots: GlowDot[],
  glowAnchorT: number,
  rotationFraction: number,
  glowColor: number,
  resolvePoint: (t: number) => [number, number],
): void => {
  const rotatedAnchorT = wrapToUnit(glowAnchorT + rotationFraction);

  for (const { perimeterOffset, radius, alpha } of dots) {
    const dotPosition = wrapToUnit(rotatedAnchorT + perimeterOffset);
    const [pointX, pointY] = resolvePoint(dotPosition);
    graphics.circle(pointX, pointY, radius);
    graphics.fill({ color: glowColor, alpha });
  }
};

/**
 * Draws the interior cutout rectangle in erase mode to get rid of the glow inside
 * the border.
 */
export const drawGlowCutout = (
  graphics: GraphicsInst,
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
    graphics.roundRect(
      cutoutX,
      cutoutY,
      cutoutWidth,
      cutoutHeight,
      innerRadius,
    );
  } else {
    graphics.rect(cutoutX, cutoutY, cutoutWidth, cutoutHeight);
  }
  const cutoutColor = 0xffffff;
  graphics.fill(cutoutColor);
};
