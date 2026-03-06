<script setup lang="ts">
import type { Bounds } from "@/api/gateway-api/generated-api";
import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";
import type { GraphicsInst } from "@/vue3-pixi";
import BorderWithRotatingGradient from "../common/BorderWithRotatingGradient.vue";
import {
  type GlowConfig,
  type GradientStop,
  parseHexColor,
} from "../common/borderWithRotatingGradientUtils";

type Props = {
  bounds: Bounds;
};

const props = defineProps<Props>();

// Border with rotating gradient and teal glow
const borderStrokeWidth = $shapes.annotationBorderWidth;

const { Cyan, Yellow, Teal } = $colors.aiGradient;
const gradient: GradientStop[] = [
  { position: 0.04, color: parseHexColor(Cyan) },
  { position: 0.25, color: parseHexColor(Yellow) },
  { position: 0.47, color: parseHexColor(Teal) },
  // mirror
  { position: 0.53, color: parseHexColor(Teal) },
  { position: 0.75, color: parseHexColor(Yellow) },
  { position: 0.96, color: parseHexColor(Cyan) },
];

const glowConfig: GlowConfig = {
  gradientStopIndex: 2, // teal
  softness: 60,
  spread: 0.6,
};
const secondsPerRotation = 1.2;

// Text skeletons. SkeletonItem from @knime/components doesn't have a WebGL equivalent,
// so we simply draw these as rounded rectangles here directly.
const skeletonColor = $colors.GrayUltraLight;

const padding = 10;
const skeletonPadding = borderStrokeWidth + padding;
const skeletonGap = 10;
const skeletonBorderRadius = 2;

const skeletonHeadingHeight = 16;
const skeletonBodyHeight = 13;

const skeletonHeadingRelativeWidth = 0.6;
const skeletonBodyRelativeWidth = 0.9;

const renderSkeletonBars = (graphics: GraphicsInst) => {
  const totalWidth = props.bounds.width - 2 * skeletonPadding;

  graphics.clear();

  // Heading bar
  graphics.roundRect(
    skeletonPadding,
    skeletonPadding,
    totalWidth * skeletonHeadingRelativeWidth,
    skeletonHeadingHeight,
    skeletonBorderRadius,
  );
  graphics.fill(skeletonColor);

  // Body bar
  graphics.roundRect(
    skeletonPadding,
    skeletonPadding + skeletonHeadingHeight + skeletonGap,
    totalWidth * skeletonBodyRelativeWidth,
    skeletonBodyHeight,
    skeletonBorderRadius,
  );
  graphics.fill(skeletonColor);
};
</script>

<template>
  <Container label="AISkeletonAnnotation" :x="bounds.x" :y="bounds.y">
    <BorderWithRotatingGradient
      :width="bounds.width"
      :height="bounds.height"
      :stroke-width="borderStrokeWidth"
      :gradient="gradient"
      :glow-config="glowConfig"
      :seconds-per-rotation="secondsPerRotation"
    />

    <Graphics
      label="SkeletonBars"
      event-mode="none"
      @render="renderSkeletonBars"
    />
  </Container>
</template>
