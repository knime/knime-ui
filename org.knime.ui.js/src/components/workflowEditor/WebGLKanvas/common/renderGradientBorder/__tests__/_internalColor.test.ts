/* eslint-disable no-bitwise */
import { describe, expect, it } from "vitest";

import { buildGradientLookupTable } from "../_internalColor";
import type { ResolvedGradientStop } from "../types";

const toRgb = (packed: number) => ({
  r: (packed >> 16) & 0xff,
  g: (packed >> 8) & 0xff,
  b: packed & 0xff,
});

const RED = 0xff0000;
const GREEN = 0x00ff00;
const BLUE = 0x0000ff;

describe("buildGradientLookupTable", () => {
  const RED_BLUE: ResolvedGradientStop[] = [
    { position: 0, color: RED },
    { position: 1, color: BLUE },
  ];

  it("returns a Uint32Array of the requested size", () => {
    const lut = buildGradientLookupTable(RED_BLUE, 64);
    expect(lut).toBeInstanceOf(Uint32Array);
    expect(lut).toHaveLength(64);
  });

  it("starts with the first stop colour", () => {
    const lut = buildGradientLookupTable(RED_BLUE, 256);
    const first = toRgb(lut[0]);
    expect(first.r).toBe(255);
    expect(first.g).toBe(0);
    expect(first.b).toBe(0);
  });

  it("ends with the last stop colour", () => {
    const lut = buildGradientLookupTable(RED_BLUE, 256);
    const last = toRgb(lut[255]);
    expect(last.r).toBe(0);
    expect(last.g).toBe(0);
    expect(last.b).toBe(255);
  });

  it("interpolates between stops at the midpoint", () => {
    const lut = buildGradientLookupTable(RED_BLUE, 256);
    const mid = toRgb(lut[128]);
    // Roughly equal parts red and blue at the midpoint
    expect(mid.r).toBeGreaterThan(100);
    expect(mid.r).toBeLessThan(155);
    expect(mid.b).toBeGreaterThan(100);
    expect(mid.b).toBeLessThan(155);
  });

  it("wraps gradient back to first colour when last stop is not at 1", () => {
    const stops: ResolvedGradientStop[] = [
      { position: 0, color: RED },
      { position: 0.5, color: GREEN },
      // No stop at 1.0 — should wrap back to red
    ];
    const lut = buildGradientLookupTable(stops, 256);
    const last = toRgb(lut[255]);
    // Should be close to first colour (red)
    expect(last.r).toBeGreaterThan(200);
    expect(last.g).toBeLessThan(55);
  });

  it("handles unsorted stops gracefully", () => {
    const stops: ResolvedGradientStop[] = [
      { position: 0.5, color: GREEN },
      { position: 0, color: RED },
      { position: 1, color: BLUE },
    ];
    const lut = buildGradientLookupTable(stops, 256);
    const first = toRgb(lut[0]);
    expect(first.r).toBe(255);
    expect(first.g).toBe(0);
  });
});
