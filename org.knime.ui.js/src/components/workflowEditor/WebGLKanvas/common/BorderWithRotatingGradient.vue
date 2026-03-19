<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { useTemplateRef } from "vue";
import { BlurFilter } from "pixi.js";

import type { GraphicsInst } from "@/vue3-pixi";

import type { GlowConfig, GradientStop } from "./renderGradientBorder";
import { drawGlowCutout, renderGradientBorder } from "./renderGradientBorder";

type Props = {
  width: number;
  height: number;
  strokeWidth: number;
  gradient: GradientStop[];
  secondsPerRotation: number;
  borderRadius: number;
  glowConfig?: GlowConfig;
};

const props = withDefaults(defineProps<Props>(), {
  glowConfig: undefined,
});

const borderRef = useTemplateRef<GraphicsInst>("borderRef");
const glowDotsRef = useTemplateRef<GraphicsInst>("glowDotsRef");

const glowBlur = props.glowConfig
  ? new BlurFilter({
      strength: props.glowConfig.softness,
      quality: 4,
    })
  : null;

const renderGlowCutout = (g: GraphicsInst) =>
  drawGlowCutout(
    g,
    props.strokeWidth,
    props.width,
    props.height,
    props.borderRadius,
  );

renderGradientBorder({
  config: {
    width: props.width,
    height: props.height,
    strokeWidth: props.strokeWidth,
    gradient: props.gradient,
    glowConfig: props.glowConfig,
    secondsPerRotation: props.secondsPerRotation,
    borderRadius: props.borderRadius,
  },
  refs: { borderRef, glowDotsRef },
});
</script>

<template>
  <Container label="BorderWithRotatingGradient" event-mode="none">
    <Graphics ref="borderRef" label="RotatingGradient" event-mode="none" />

    <Container v-if="glowBlur" label="Glow">
      <Graphics
        ref="glowDotsRef"
        label="GlowDots"
        event-mode="none"
        :filters="[glowBlur]"
      />
      <Graphics
        label="GlowCutout"
        event-mode="none"
        blend-mode="erase"
        @render="renderGlowCutout"
      />
    </Container>
  </Container>
</template>
