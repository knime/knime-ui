import type { ShallowRef } from "vue";
import { Color, type Graphics } from "pixi.js";

import { onTick } from "@/vue3-pixi/composables/onTick";

import { buildGradientLookupTable } from "./_internalColor";
import {
  type BorderResources,
  drawBorder,
  drawGlowDots,
} from "./_internalDraw";
import { buildGlow } from "./_internalGlow";
import { buildGeometry } from "./_internalPerimeter";
import type { GlowConfig, GradientStop, ResolvedGradientStop } from "./types";

type Config = {
  width: number;
  height: number;
  strokeWidth: number;
  gradient: GradientStop[];
  glowConfig?: GlowConfig;
  secondsPerRotation: number;
  borderRadius: number;
};

type GraphicsRefs = {
  borderRef: Readonly<ShallowRef<Graphics | null>>;
  glowDotsRef: Readonly<ShallowRef<Graphics | null>>;
};

/**
 * Given the gradient and glow configuration, this function
 * takes care of pre-computing all the necessary information (segments,
 * segment colours, glow blobs) and re-drawing the border with gradient and glow
 * dots every frame.
 *
 * The border is intended as an ephemeral loading/processing indicator whose size
 * and shape do not change after mount. Thus, the inputs (except for the refs that
 * are drawn into) are assumed to be non-reactive.
 */
export const renderGradientBorder = ({
  config,
  refs,
}: {
  config: Config;
  refs: GraphicsRefs;
}): void => {
  const {
    width,
    height,
    strokeWidth,
    gradient,
    glowConfig,
    secondsPerRotation,
    borderRadius,
  } = config;

  const { borderRef, glowDotsRef } = refs;

  // Resolve CSS colour strings to packed 0xRRGGBB integers.
  // (we do colour interpolation in RGB space, and it's better to do the conversion
  // here using Color rather than in the _internal modules so that they don't
  // have a dependency on pixi.js)
  const resolvedGradient: ResolvedGradientStop[] = gradient.map((s) => ({
    position: s.position,
    color: new Color(s.color).toNumber(),
  }));

  // Precompute static resources
  const borderResources: BorderResources = {
    geometry: buildGeometry(width, height, strokeWidth, borderRadius),
    colorLookupTable: buildGradientLookupTable(resolvedGradient, 512),
    strokeWidth,
  };
  const glow = buildGlow(
    glowConfig,
    resolvedGradient,
    width,
    height,
    borderRadius,
  );

  // Current rotation progress, 0–1
  let rotationFraction = 0;

  onTick((ticker) => {
    const deltaSeconds = ticker.deltaMS / 1000;
    rotationFraction =
      (rotationFraction + deltaSeconds / secondsPerRotation) % 1;

    if (borderRef.value) {
      borderRef.value.clear();
      drawBorder(borderRef.value, rotationFraction, borderResources);
    }

    if (glow && glowDotsRef.value) {
      glowDotsRef.value.clear();
      drawGlowDots(glowDotsRef.value, rotationFraction, glow);
    }
  });
};
