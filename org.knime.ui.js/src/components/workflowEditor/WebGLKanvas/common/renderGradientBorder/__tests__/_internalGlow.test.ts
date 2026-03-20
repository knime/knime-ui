import { describe, expect, it } from "vitest";

import { computeGlowDots } from "../_internalGlow";

describe("computeGlowDots", () => {
  it("always returns an odd number of dots", () => {
    const dots = computeGlowDots({ gradientStopIndex: 0 });
    expect(dots.length % 2).toBe(1);
  });

  it("returns more dots with higher spread", () => {
    const tight = computeGlowDots({ gradientStopIndex: 0, spread: 0 });
    const wide = computeGlowDots({ gradientStopIndex: 0, spread: 1 });
    expect(wide.length).toBeGreaterThan(tight.length);
  });

  it("centres the cluster symmetrically around offset 0", () => {
    const dots = computeGlowDots({ gradientStopIndex: 0, spread: 0.5 });
    const offsets = dots.map((d) => d.perimeterOffset);
    const firstOffset = offsets[0];
    const lastOffset = offsets[offsets.length - 1];
    expect(firstOffset).toBeCloseTo(-lastOffset);
  });

  it("gives the centre dot the largest radius", () => {
    const dots = computeGlowDots({ gradientStopIndex: 0, spread: 0.5 });
    const midIndex = Math.floor(dots.length / 2);
    const centerRadius = dots[midIndex].radius;
    for (const dot of dots) {
      expect(dot.radius).toBeLessThanOrEqual(centerRadius + 0.001);
    }
  });

  it("applies the configured opacity to all dots", () => {
    const opacity = 0.42;
    const dots = computeGlowDots({ gradientStopIndex: 0, opacity });
    for (const dot of dots) {
      expect(dot.alpha).toBe(opacity);
    }
  });

  it("uses default opacity when not specified", () => {
    const dots = computeGlowDots({ gradientStopIndex: 0 });
    // Default opacity is 0.1
    for (const dot of dots) {
      expect(dot.alpha).toBe(0.1);
    }
  });
});
