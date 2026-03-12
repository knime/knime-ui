/* eslint-disable no-magic-numbers */
import type { GlowConfig, GlowDot } from "./types";

/**
 * Given a GlowConfig, computes the array of GlowDots that will produce the
 * glow effect when drawn and blurred each frame.
 *
 * Each dot describes a circle (offset from anchor, radius, alpha) that gets placed along
 * the border perimeter at render time. A BlurFilter then smears them into
 * a continuous glow. Dots are shaped to mimic a bell curve with larger radius towards the middle,
 * falling off towards the edges.
 *
 * The `spread` (0–1) interpolates between two visuals:
 * - spread close to 0: ____▓██▓____
 * - spread close to 1: ░░▒▒▓▓▓▓▒▒░░
 *
 * The dot count is always kept odd so that the cluster is symmetric around its centre.
 */
export const computeGlowDots = (glowConfig: GlowConfig): GlowDot[] => {
  const { opacity = 0.1, spread = 0.5 } = glowConfig;

  const baseFalloff = 0.38;
  const tight = {
    dotCount: 5,
    dotSpacing: 0.005, // fraction of perimeter between adjacent dots
    centerRadius: 42, // px — circle radius at the centre dot
    edgeRadius: 5, // px — circle radius at the outermost dots
    falloffPower: baseFalloff * 4, // exponent shaping the radius bell curve (higher = sharper peak)
  };
  const wide = {
    dotCount: 29,
    dotSpacing: 0.041,
    centerRadius: 14,
    edgeRadius: 17,
    falloffPower: baseFalloff / 4,
  };

  const lerp = (a: number, b: number) => a + (b - a) * spread;

  // Keep dot count odd so the cluster is symmetric around its centre
  let dotCount = Math.round(lerp(tight.dotCount, wide.dotCount));
  if (dotCount % 2 === 0) {
    dotCount++;
  }

  const dotSpacing = lerp(tight.dotSpacing, wide.dotSpacing);
  const centerRadius = lerp(tight.centerRadius, wide.centerRadius);
  const edgeRadius = lerp(tight.edgeRadius, wide.edgeRadius);
  const falloffPower =
    tight.falloffPower *
    Math.pow(wide.falloffPower / tight.falloffPower, spread);

  const halfSpan = ((dotCount - 1) / 2) * dotSpacing;

  const dots: GlowDot[] = [];
  for (let dotIndex = 0; dotIndex < dotCount; dotIndex++) {
    // 0 at centre, 1 at edges
    const distanceFromCenter =
      dotCount > 1
        ? Math.abs(dotIndex - (dotCount - 1) / 2) / ((dotCount - 1) / 2)
        : 0;

    const bellCurve = Math.pow(1 - distanceFromCenter, falloffPower);

    dots.push({
      perimeterOffset: -halfSpan + dotIndex * dotSpacing,
      radius: edgeRadius + (centerRadius - edgeRadius) * bellCurve,
      alpha: opacity,
    });
  }

  return dots;
};
