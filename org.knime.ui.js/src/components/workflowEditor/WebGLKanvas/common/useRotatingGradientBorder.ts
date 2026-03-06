import type { ShallowRef } from "vue";

import type { GraphicsInst } from "@/vue3-pixi";
import { onTick } from "@/vue3-pixi/composables/onTick";

import {
  buildGlowPoints,
  buildGradientLUT,
  buildRoundedGeometry,
  buildSharpGeometry,
  createPerimeterResolver,
  drawBorder,
  drawGlowCutout,
  drawGlowDots,
} from "./borderWithRotatingGradientUtils";
import type {
  GlowConfig,
  GradientStop,
} from "./borderWithRotatingGradientUtils";

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
  glowCutoutRef: Readonly<ShallowRef<GraphicsInst | null>>;
};

/**
 * Given the gradient and glow configuration, this composable
 * takes care of pre-computing all the necessary information (segments,
 * segment colours, glow blobs) and re-drawing the border with gradient and glow dots
 * every frame.
 */
export const useRotatingGradientBorder = ({
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

  const { borderRef, glowDotsRef, glowCutoutRef } = refs;

  // 1. Pre-compute gradient colour values
  const gradientLUT = buildGradientLUT(gradient, 512);

  // 2. Pre-compute segments for the given border shape
  const geometry =
    borderRadius === 0
      ? buildSharpGeometry(width, height, strokeWidth)
      : buildRoundedGeometry(width, height, strokeWidth, borderRadius);

  // 3. Construct array of blobs that will travel around the shape and emit glow
  const glowDotData = glowConfig ? buildGlowPoints(glowConfig) : null;
  const glowPerimeterPoint = glowConfig
    ? createPerimeterResolver(width, height, borderRadius)
    : null;
  const glowCenterTBase = glowConfig
    ? gradient[glowConfig.gradientStopIndex].position
    : 0;
  const glowColor = glowConfig
    ? gradient[glowConfig.gradientStopIndex].color
    : 0;

  let cutoutDrawn = false;
  let rotationFraction = 0;

  // Re-draw border and glow on every frame using pre-computed values
  onTick((ticker) => {
    const dt = ticker.deltaMS / 1000;
    rotationFraction = (rotationFraction + dt / secondsPerRotation) % 1;

    if (borderRef.value) {
      borderRef.value.clear();
      drawBorder(
        borderRef.value,
        geometry,
        rotationFraction,
        gradientLUT,
        strokeWidth,
      );
    }

    if (
      glowDotData &&
      glowPerimeterPoint &&
      glowDotsRef.value &&
      glowCutoutRef.value
    ) {
      glowDotsRef.value.clear();
      drawGlowDots(
        glowDotsRef.value,
        glowDotData,
        glowCenterTBase,
        rotationFraction,
        glowColor,
        glowPerimeterPoint,
      );

      if (!cutoutDrawn) {
        drawGlowCutout(
          glowCutoutRef.value,
          strokeWidth,
          width,
          height,
          borderRadius,
        );
        cutoutDrawn = true;
      }
    }
  });
};
