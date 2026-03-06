<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { useTemplateRef } from "vue";
import { BlurFilter } from "pixi.js";

import type { GraphicsInst } from "@/vue3-pixi";

import type {
  GlowConfig,
  GradientStop,
} from "./borderWithRotatingGradientUtils";
import { useRotatingGradientBorder } from "./useRotatingGradientBorder";

type Props = {
  width: number;
  height: number;
  strokeWidth: number;
  gradient: GradientStop[];
  glowConfig?: GlowConfig;
  secondsPerRotation?: number;
  borderRadius?: number;
};

const props = withDefaults(defineProps<Props>(), {
  glowConfig: undefined,
  secondsPerRotation: 1.5,
  borderRadius: 0,
});

const borderRef = useTemplateRef<GraphicsInst>("borderRef");
const glowDotsRef = useTemplateRef<GraphicsInst>("glowDotsRef");
const glowCutoutRef = useTemplateRef<GraphicsInst>("glowCutoutRef");

const glowBlur = props.glowConfig
  ? new BlurFilter({
      strength: props.glowConfig.softness,
      quality: 4,
    })
  : null;

useRotatingGradientBorder({
  config: {
    width: props.width,
    height: props.height,
    strokeWidth: props.strokeWidth,
    gradient: props.gradient,
    glowConfig: props.glowConfig,
    secondsPerRotation: props.secondsPerRotation,
    borderRadius: props.borderRadius,
  },
  refs: { borderRef, glowDotsRef, glowCutoutRef },
});
</script>

<template>
  <Container label="BorderWithRotatingGradient" event-mode="none">
    <Graphics ref="borderRef" label="RotatingGradient" event-mode="none" />

    <Container v-if="glowBlur" label="GlowRenderGroup" :is-render-group="true">
      <Graphics
        ref="glowDotsRef"
        label="GlowDots"
        event-mode="none"
        :filters="[glowBlur]"
      />
      <Graphics
        ref="glowCutoutRef"
        label="GlowCutout"
        event-mode="none"
        :blend-mode="'erase'"
      />
    </Container>
  </Container>
</template>
