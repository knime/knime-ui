import { beforeEach, describe, expect, it, vi } from "vitest";
import { shallowRef } from "vue";
import type { Graphics, Ticker } from "pixi.js";

import * as internalColor from "../_internalColor";
import * as internalDraw from "../_internalDraw";
import * as internalGlow from "../_internalGlow";
import * as internalPerimeter from "../_internalPerimeter";
import { renderGradientBorder } from "../renderGradientBorder";
import type { GradientStop } from "../types";

let capturedTickCallback: ((ticker: Ticker) => void) | null = null;

vi.mock("@/vue3-pixi/composables/onTick", () => ({
  onTick: (fn: (ticker: Ticker) => void) => {
    capturedTickCallback = fn;
    return () => {};
  },
}));

const buildGeometrySpy = vi.spyOn(internalPerimeter, "buildGeometry");
const buildGradientLookupTableSpy = vi.spyOn(
  internalColor,
  "buildGradientLookupTable",
);
const buildGlowSpy = vi.spyOn(internalGlow, "buildGlow");
const drawBorderSpy = vi.spyOn(internalDraw, "drawBorder");

const tick = (deltaMS: number) =>
  capturedTickCallback!({ deltaMS } as unknown as Ticker);

const SIMPLE_GRADIENT: GradientStop[] = [
  { position: 0, color: "#ff0000" },
  { position: 1, color: "#0000ff" },
];

const makeConfig = (overrides = {}) => ({
  width: 100,
  height: 60,
  strokeWidth: 2,
  gradient: SIMPLE_GRADIENT,
  secondsPerRotation: 2,
  borderRadius: 0,
  ...overrides,
});

const mockGraphics = (): Graphics =>
  ({
    clear: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    circle: vi.fn(),
    rect: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
  }) as unknown as Graphics;

describe("renderGradientBorder", () => {
  beforeEach(() => {
    capturedTickCallback = null;
    vi.clearAllMocks();
  });

  it("precomputes geometry, color LUT, and glow before registering tick", () => {
    renderGradientBorder({
      config: makeConfig(),
      refs: {
        borderRef: shallowRef(null),
        glowDotsRef: shallowRef(null),
      },
    });

    expect(buildGeometrySpy).toHaveBeenCalledOnce();
    expect(buildGradientLookupTableSpy).toHaveBeenCalledOnce();
    expect(buildGlowSpy).toHaveBeenCalledOnce();
  });

  it("does not re-precompute on subsequent ticks", () => {
    const border = mockGraphics();

    renderGradientBorder({
      config: makeConfig(),
      refs: {
        borderRef: shallowRef<Graphics | null>(border),
        glowDotsRef: shallowRef(null),
      },
    });

    vi.clearAllMocks();
    tick(16);
    tick(16);
    tick(16);

    expect(buildGeometrySpy).not.toHaveBeenCalled();
    expect(buildGradientLookupTableSpy).not.toHaveBeenCalled();
    expect(buildGlowSpy).not.toHaveBeenCalled();
  });

  it("registers a tick callback", () => {
    renderGradientBorder({
      config: makeConfig(),
      refs: {
        borderRef: shallowRef(null),
        glowDotsRef: shallowRef(null),
      },
    });

    expect(capturedTickCallback).toBeTypeOf("function");
  });

  it("clears and redraws border graphics on tick", () => {
    const border = mockGraphics();
    const borderRef = shallowRef<Graphics | null>(border);

    renderGradientBorder({
      config: makeConfig(),
      refs: { borderRef, glowDotsRef: shallowRef(null) },
    });

    tick(16);

    expect(border.clear).toHaveBeenCalled();
    expect(border.stroke).toHaveBeenCalled();
  });

  it("advances rotation fraction proportionally to elapsed time", () => {
    const border = mockGraphics();
    const secondsPerRotation = 2;

    renderGradientBorder({
      config: makeConfig({ secondsPerRotation }),
      refs: {
        borderRef: shallowRef<Graphics | null>(border),
        glowDotsRef: shallowRef(null),
      },
    });

    // 500ms = 0.5s → 0.5 / 2 = 0.25 of a full rotation
    tick(500);
    const firstRotation = drawBorderSpy.mock.calls[0][1];
    expect(firstRotation).toBeCloseTo(0.25);

    // Another 500ms → cumulative 0.5
    tick(500);
    const secondRotation = drawBorderSpy.mock.calls[1][1];
    expect(secondRotation).toBeCloseTo(0.5);
  });

  it("wraps rotation fraction back into [0, 1)", () => {
    const border = mockGraphics();
    const secondsPerRotation = 1;

    renderGradientBorder({
      config: makeConfig({ secondsPerRotation }),
      refs: {
        borderRef: shallowRef<Graphics | null>(border),
        glowDotsRef: shallowRef(null),
      },
    });

    // 1200ms = 1.2s at 1s/rotation → fraction should wrap to 0.2
    tick(1200);
    const rotation = drawBorderSpy.mock.calls[0][1];
    expect(rotation).toBeGreaterThanOrEqual(0);
    expect(rotation).toBeLessThan(1);
    expect(rotation).toBeCloseTo(0.2);
  });

  it("skips drawing when border ref is null", () => {
    const border = mockGraphics();
    const borderRef = shallowRef<Graphics | null>(null);

    renderGradientBorder({
      config: makeConfig(),
      refs: { borderRef, glowDotsRef: shallowRef(null) },
    });

    tick(16);

    expect(border.clear).not.toHaveBeenCalled();
  });
});
