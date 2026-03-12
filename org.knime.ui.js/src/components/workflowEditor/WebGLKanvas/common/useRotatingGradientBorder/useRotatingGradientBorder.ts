import type { ShallowRef } from "vue";
import { Color } from "pixi.js";

import type { GraphicsInst } from "@/vue3-pixi";
import { onTick } from "@/vue3-pixi/composables/onTick";

import { buildGradientLookupTable } from "./_internalColor";
import { drawBorder, drawGlowCutout, drawGlowDots } from "./_internalDraw";
import { computeGlowDots } from "./_internalGlow";
import {
  buildRoundedGeometry,
  buildSharpGeometry,
  computePerimeter,
  getPerimeterPoint,
} from "./_internalPerimeter";
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
  glowCutoutRef: Readonly<ShallowRef<GraphicsInst | null>>;
};

/**
 * Given the gradient and glow configuration, this composable
 * takes care of pre-computing all the necessary information (segments,
 * segment colours, glow blobs) and re-drawing the border with gradient and glow
 * dots every frame.
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
  const gradientColorLookup = buildGradientLookupTable(gradient, 512);

  // 2. Pre-compute segments for the given border shape
  const geometry =
    borderRadius === 0
      ? buildSharpGeometry(width, height, strokeWidth)
      : buildRoundedGeometry(width, height, strokeWidth, borderRadius);

  // 3. Construct array of dots that will travel around the shape and emit glow.
  const glowDots = glowConfig ? computeGlowDots(glowConfig) : null;
  const glowPerimeter = glowConfig
    ? computePerimeter(width, height, 0, borderRadius)
    : null;
  const glowAnchorT = glowConfig
    ? gradient[glowConfig.gradientStopIndex].position
    : 0;
  const glowColor = glowConfig
    ? new Color(gradient[glowConfig.gradientStopIndex].color).toNumber()
    : 0;

  // Whether the static glow cutout has been drawn. The cutout lives on its own
  // Graphics instance (glowCutoutRef) that is never cleared, so it only needs
  // to be drawn once
  let cutoutDrawn = false;
  let rotationFraction = 0;

  // Re-draw border and glow on every frame using pre-computed values
  onTick((ticker) => {
    const deltaSeconds = ticker.deltaMS / 1000;
    rotationFraction =
      (rotationFraction + deltaSeconds / secondsPerRotation) % 1;

    if (borderRef.value) {
      borderRef.value.clear();
      drawBorder(
        borderRef.value,
        geometry,
        rotationFraction,
        gradientColorLookup,
        strokeWidth,
      );
    }

    if (glowDots && glowPerimeter && glowDotsRef.value && glowCutoutRef.value) {
      glowDotsRef.value.clear();
      drawGlowDots(
        glowDotsRef.value,
        glowDots,
        glowAnchorT,
        rotationFraction,
        glowColor,
        (t) => getPerimeterPoint(t, glowPerimeter),
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
