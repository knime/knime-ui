<script setup lang="ts">
import { computed } from "vue";

import { useAiQuickActionsStore } from "@/store/ai/aiQuickActions";
import { QuickActionId } from "@/store/ai/types";
import * as $colors from "@/style/colors";
import * as $shapes from "@/style/shapes";
import type { GraphicsInst } from "@/vue3-pixi";
import BorderWithRotatingGradient from "../common/BorderWithRotatingGradient.vue";
import {
  type GlowConfig,
  type GradientStop,
} from "../common/useRotatingGradientBorder";

const aiQuickActionsStore = useAiQuickActionsStore();
const bounds = computed(
  () =>
    aiQuickActionsStore.processingActions[QuickActionId.GenerateAnnotation]
      ?.bounds ?? null,
);

// Border with rotating gradient and teal glow
const aiGradientColors = {
  Cyan: "hsl(185.81, 49.21%, 87.65%)", // #D0ECEF
  Yellow: "hsl(51.23, 100%, 49.61%)", // #FDD800
  Teal: "hsl(193.08, 60.18%, 43.33%)", // #2C94B1
};
const { Cyan, Yellow, Teal } = aiGradientColors;
const gradient: GradientStop[] = [
  { position: 0, color: Cyan },
  { position: 0.25, color: Yellow },
  { position: 0.47, color: Teal },
  { position: 0.75, color: Yellow },
  { position: 1, color: Cyan },
];

const borderStrokeWidth = $shapes.annotationBorderWidth;
const glowConfig: GlowConfig = {
  gradientStopIndex: 2, // teal
  softness: 60,
  spread: 0.7,
};
const secondsPerRotation = 1.2;
const borderRadius = 0;

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
  if (!bounds.value) {
    return;
  }

  const totalWidth = bounds.value.width - 2 * skeletonPadding;

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
  <Container
    v-if="bounds"
    label="AISkeletonAnnotation"
    :x="bounds.x"
    :y="bounds.y"
  >
    <BorderWithRotatingGradient
      :width="bounds.width"
      :height="bounds.height"
      :stroke-width="borderStrokeWidth"
      :gradient="gradient"
      :glow-config="glowConfig"
      :seconds-per-rotation="secondsPerRotation"
      :border-radius="borderRadius"
    />

    <Graphics
      label="SkeletonBars"
      event-mode="none"
      @render="renderSkeletonBars"
    />
  </Container>
</template>
