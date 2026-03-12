import { Color } from "pixi.js";

import type { GradientStop } from "./types";

/**
 * Pre-sample a gradient into a fixed-size colour lookup table.
 */
export const buildGradientLookupTable = (
  stops: GradientStop[],
  size: number,
): Uint32Array => {
  // 1. Ensure stops are sorted by position and cast colours to Pixi
  const orderedStops = stops
    .map((s) => ({ position: s.position, color: new Color(s.color) }))
    .toSorted((a, b) => a.position - b.position);

  // 2. Ensure the first and last stops are the same, so that the gradient is smooth
  const first = orderedStops[0];
  const last = orderedStops[orderedStops.length - 1];
  if (last.position < 1 || last.color.toNumber() !== first.color.toNumber()) {
    orderedStops.push({ position: 1, color: first.color });
  }

  // 3. Fill the LUT by interpolating between adjacent stops as we move along
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

    const leftStop = orderedStops[leftIndex];
    const rightStop = orderedStops[leftIndex + 1];

    // How far apart are these two specific colors
    const distanceBetweenStops = rightStop.position - leftStop.position;

    // What percentage of the way are we from the left color to the right color
    const mixRatio =
      distanceBetweenStops === 0
        ? 0
        : (overallProgress - leftStop.position) / distanceBetweenStops;

    // Linearly interpolate the RGB components and pack into the LUT
    const fromColor = leftStop.color.toRgbArray();
    const toColor = rightStop.color.toRgbArray();

    lut[i] = new Color([
      fromColor[0] + (toColor[0] - fromColor[0]) * mixRatio,
      fromColor[1] + (toColor[1] - fromColor[1]) * mixRatio,
      fromColor[2] + (toColor[2] - fromColor[2]) * mixRatio,
    ]).toNumber();
  }

  return lut;
};
