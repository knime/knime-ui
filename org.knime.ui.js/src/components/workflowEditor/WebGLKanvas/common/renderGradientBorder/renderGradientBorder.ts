import type { ShallowRef } from "vue";

import type { GraphicsInst } from "@/vue3-pixi";
import { onTick } from "@/vue3-pixi/composables/onTick";

import { buildGradientLookupTable } from "./_internalColor";
import {
  type BorderResources,
  drawBorder,
  drawGlowDots,
} from "./_internalDraw";
import { buildGlow } from "./_internalGlow";
import { buildGeometry } from "./_internalPerimeter";
import type { GlowConfig, GradientStop } from "./types";

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
  borderRef: Readonly<ShallowRef<GraphicsInst | null>>;
  glowDotsRef: Readonly<ShallowRef<GraphicsInst | null>>;
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

  // Precompute static resources
  const borderResources: BorderResources = {
    geometry: buildGeometry(width, height, strokeWidth, borderRadius),
    colorLookupTable: buildGradientLookupTable(gradient, 512),
    strokeWidth,
  };
  const glow = buildGlow(glowConfig, gradient, width, height, borderRadius);

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
