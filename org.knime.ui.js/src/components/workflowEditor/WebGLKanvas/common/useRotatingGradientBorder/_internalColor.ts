import { Color } from "pixi.js";

import type { GradientStop } from "./types";

/**
 * Pre-sample a gradient into a fixed-size colour lookup table.
 *
 * Each entry is a packed 0xRRGGBB integer suitable for passing directly
 * to PixiJS drawing methods.
 */
export const buildGradientLookupTable = (
  stops: GradientStop[],
  size: number,
): Uint32Array => {
  // 1. Parse each stop's RGB components once (0–255) and sort by position
  const orderedStops = stops
    .map((s) => {
      const [r, g, b] = new Color(s.color).toRgbArray(); // 0–1 floats
      return { position: s.position, r: r * 255, g: g * 255, b: b * 255 };
    })
    .toSorted((a, b) => a.position - b.position);

  // 2. Ensure the gradient wraps smoothly by closing back to the first colour
  const first = orderedStops[0];
  const last = orderedStops[orderedStops.length - 1];
  const lastMatchesFirst =
    last.position >= 1 &&
    last.r === first.r &&
    last.g === first.g &&
    last.b === first.b;

  if (!lastMatchesFirst) {
    orderedStops.push({ position: 1, r: first.r, g: first.g, b: first.b });
  }

  // 3. Fill the LUT by interpolating between adjacent stops
  const lut = new Uint32Array(size);
  let leftIndex = 0;

  for (let i = 0; i < size; i++) {
    // Our exact position along the whole gradient, from 0.0 to 1.0
    const overallProgress = i / (size - 1);

    // Advance to the pair of stops that surrounds our current position
    while (
      leftIndex < orderedStops.length - 2 &&
      overallProgress > orderedStops[leftIndex + 1].position
    ) {
      leftIndex++;
    }

    const left = orderedStops[leftIndex];
    const right = orderedStops[leftIndex + 1];

    // How far apart are these two specific colors
    const span = right.position - left.position;

    // What percentage of the way are we from the left color to the right color
    const mix = span === 0 ? 0 : (overallProgress - left.position) / span;

    // Linearly interpolate each channel and pack into 0xRRGGBB
    const r = Math.round(left.r + (right.r - left.r) * mix);
    const g = Math.round(left.g + (right.g - left.g) * mix);
    const b = Math.round(left.b + (right.b - left.b) * mix);

    lut[i] = (r << 16) | (g << 8) | b;
  }

  return lut;
};
