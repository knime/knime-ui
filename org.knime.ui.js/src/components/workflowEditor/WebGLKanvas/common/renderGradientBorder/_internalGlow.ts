/* eslint-disable no-magic-numbers */
import { Color } from "pixi.js";

import { type Perimeter, computePerimeter } from "./_internalPerimeter";
import type { GlowConfig, GlowDot, GradientStop } from "./types";

// Each profile defines the dot cluster at one extreme of the
// `spread` slider.  Intermediate values of `spread` interpolate
// between tight and wide.

type GlowProfile = {
  /** Number of circles in the cluster */
  dotCount: number;
  /** Fraction of the perimeter between adjacent dots */
  dotSpacing: number;
  /** Circle radius (px) at the centre of the cluster */
  centerRadius: number;
  /** Circle radius (px) at the outermost dots */
  edgeRadius: number;
  /**
   * Exponent for the bell-curve which shapes the radius falloff.
   * Higher = radius drops off sharply from centre (leading to a pronounced peak).
   * Lower = radius stays large across the cluster (leading to a flat glow).
   */
  falloffPower: number;
};

/**
 * Base falloff exponent.  The tight and wide profiles are derived by
 * scaling this value up and down respectively, keeping them anchored
 * to the same perceptual baseline.
 */
const BASE_FALLOFF = 0.5;

const TIGHT_PROFILE: GlowProfile = {
  dotCount: 5,
  dotSpacing: 0.005,
  centerRadius: 42,
  edgeRadius: 5,
  falloffPower: BASE_FALLOFF * 4,
};

const WIDE_PROFILE: GlowProfile = {
  dotCount: 29,
  dotSpacing: 0.041,
  centerRadius: 28,
  edgeRadius: 12,
  falloffPower: BASE_FALLOFF / 4,
};

/**
 * Given a GlowConfig, computes the array of GlowDots that will
 * produce the glow effect when drawn and blurred each frame.
 *
 * The dot count is always kept odd so that the cluster is symmetric
 * around its centre dot (the anchor point on the perimeter).
 */
export const computeGlowDots = (glowConfig: GlowConfig): GlowDot[] => {
  const { opacity = 0.1, spread = 0.5 } = glowConfig;

  const lerp = (a: number, b: number) => a + (b - a) * spread;

  // Keep dot count odd so the cluster is symmetric around its centre
  let dotCount = Math.round(
    lerp(TIGHT_PROFILE.dotCount, WIDE_PROFILE.dotCount),
  );
  if (dotCount % 2 === 0) {
    dotCount++;
  }

  const dotSpacing = lerp(TIGHT_PROFILE.dotSpacing, WIDE_PROFILE.dotSpacing);
  const centerRadius = lerp(
    TIGHT_PROFILE.centerRadius,
    WIDE_PROFILE.centerRadius,
  );
  const edgeRadius = lerp(TIGHT_PROFILE.edgeRadius, WIDE_PROFILE.edgeRadius);

  // Falloff is interpolated logarithmically rather than linearly in order
  // to achieve a more natural look
  const falloffPower =
    TIGHT_PROFILE.falloffPower *
    Math.pow(WIDE_PROFILE.falloffPower / TIGHT_PROFILE.falloffPower, spread);

  // Half the perimeter-fraction spanned by the cluster
  const halfSpan = ((dotCount - 1) / 2) * dotSpacing;

  const dots: GlowDot[] = [];
  for (let dotIndex = 0; dotIndex < dotCount; dotIndex++) {
    // 0 at centre, 1 at outermost dot
    const distanceFromCenter =
      dotCount > 1
        ? Math.abs(dotIndex - (dotCount - 1) / 2) / ((dotCount - 1) / 2)
        : 0;

    // 1 at centre, falling toward 0 at edges.
    // Controls how the dot radius tapers from centerRadius to edgeRadius.
    const bellCurve = Math.pow(1 - distanceFromCenter, falloffPower);

    dots.push({
      perimeterOffset: -halfSpan + dotIndex * dotSpacing,
      radius: edgeRadius + (centerRadius - edgeRadius) * bellCurve,
      alpha: opacity,
    });
  }

  return dots;
};

export type PrecomputedGlow = {
  dots: GlowDot[];
  perimeter: Perimeter;
  /** Perimeter-fraction where the middle of the glow cluster is anchored (before rotation) */
  anchorT: number;
  /** Packed 0xRRGGBB colour for all glow dots */
  color: number;
};

/**
 * Builds the complete precomputed glow state, or returns null if
 * glow is not configured.
 */
export const buildGlow = (
  glowConfig: GlowConfig | undefined,
  gradient: GradientStop[],
  width: number,
  height: number,
  borderRadius: number,
): PrecomputedGlow | null => {
  if (!glowConfig) {
    return null;
  }

  const stop = gradient[glowConfig.gradientStopIndex];
  return {
    dots: computeGlowDots(glowConfig),
    perimeter: computePerimeter(width, height, 0, borderRadius),
    anchorT: stop.position,
    color: new Color(stop.color).toNumber(),
  };
};
