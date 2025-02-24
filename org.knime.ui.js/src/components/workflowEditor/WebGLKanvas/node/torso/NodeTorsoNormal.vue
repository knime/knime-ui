<!-- eslint-disable no-magic-numbers -->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import * as PIXI from "pixi.js";

import {
  type NativeNodeInvariants,
  Node,
} from "@/api/gateway-api/generated-api";
import * as $colors from "@/style/colors";
import { nodeBackgroundColors } from "@/style/colors";
import type { GraphicsInst } from "@/vue3-pixi";

const componentBackgroundPortion = 0.75;

const drawDefault = (graphics: GraphicsInst) => {
  graphics.moveTo(0, 29.2);
  graphics.lineTo(0, 2.8);
  graphics.quadraticCurveTo(0, 0, 2.8, 0);
  graphics.lineTo(29.2, 0);
  graphics.quadraticCurveTo(32, 0, 32, 2.8);
  graphics.lineTo(32, 29.2);
  graphics.quadraticCurveTo(32, 32, 29.2, 32);
  graphics.lineTo(2.8, 32);
  graphics.quadraticCurveTo(0, 32, 0, 29.2);
};

const drawLoopEnd = (graphics: GraphicsInst) => {
  graphics.moveTo(32, 2.8);
  graphics.lineTo(32, 29.2);
  graphics.quadraticCurveTo(32, 32, 29.2, 32);
  graphics.lineTo(4, 32);
  graphics.lineTo(0, 16.1);
  graphics.lineTo(4, 0);
  graphics.lineTo(29.2, 0);
  graphics.quadraticCurveTo(32, 0, 32, 2.8);
};

const drawLoopStart = (graphics: GraphicsInst) => {
  graphics.moveTo(0, 29.2);
  graphics.lineTo(0, 2.8);
  graphics.quadraticCurveTo(0, 0, 2.8, 0);
  graphics.lineTo(32, 0);
  graphics.lineTo(28, 15.9);
  graphics.lineTo(32, 32);
  graphics.lineTo(2.8, 32);
  graphics.quadraticCurveTo(0, 32, 0, 29.2);
};

const drawVirtualIn = (graphics: GraphicsInst) => {
  graphics.moveTo(32, 2.8);
  graphics.lineTo(32, 29.2);
  graphics.quadraticCurveTo(32, 32, 29.2, 32);
  graphics.lineTo(6.5, 32);
  graphics.lineTo(0, 25.9);
  graphics.lineTo(5.2, 15.9);
  graphics.lineTo(0.7, 7.2);
  graphics.lineTo(6.5, 0);
  graphics.lineTo(29.2, 0);
  graphics.quadraticCurveTo(32, 0, 32, 2.8);
};

const drawVirtualOut = (graphics: GraphicsInst) => {
  graphics.moveTo(0, 29.2);
  graphics.lineTo(0, 2.8);
  graphics.quadraticCurveTo(0, 0, 2.8, 0);
  graphics.lineTo(32, 0);
  graphics.lineTo(26.2, 7.2);
  graphics.lineTo(30.7, 15.9);
  graphics.lineTo(25.5, 25.9);
  graphics.lineTo(32, 32);
  graphics.lineTo(2.8, 32);
  graphics.quadraticCurveTo(0, 32, 0, 29.2);
};

type Props = {
  nodeId: string;
  kind: Node.KindEnum;
  icon: string | null;
  type: NativeNodeInvariants.TypeEnum | null;
};

const props = defineProps<Props>();

const isComponent = computed(() => props.kind === Node.KindEnum.Component);

const backgroundColor = computed(() => {
  // In case of unknown type, use Hibiscus Dark
  return props.type ? nodeBackgroundColors[props.type] : $colors.HibiscusDark;
});

const renderFunctionMapper = {
  LoopStart: drawLoopStart,
  LoopEnd: drawLoopEnd,
  ScopeStart: drawLoopStart,
  ScopeEnd: drawLoopEnd,
  VirtualIn: drawVirtualIn,
  VirtualOut: drawVirtualOut,
} as const;

const renderTorso = (graphics: GraphicsInst, backgroundColor: string) => {
  graphics.clear();
  const draw = renderFunctionMapper[props.type!] ?? drawDefault;
  draw(graphics);
  graphics.closePath();
  graphics.fill(backgroundColor);
};

const texture = ref<PIXI.Texture>();

const NODE_ICON_SIZE = 16;
const nodeIconScaleFactor = ref(0);

onMounted(() => {
  if (props.icon) {
    const imageLocal = new window.Image();
    imageLocal.src = props.icon;

    imageLocal.onload = () => {
      nodeIconScaleFactor.value =
        NODE_ICON_SIZE /
        Math.max(imageLocal.naturalWidth, imageLocal.naturalHeight);

      // draw image on a temp canvas to make pixi happy
      const canvas = document.createElement("canvas");
      canvas.width = imageLocal.naturalWidth;
      canvas.height = imageLocal.naturalHeight;
      const context = canvas.getContext("2d")!;

      context.drawImage(
        imageLocal,
        0,
        0,
        imageLocal.naturalWidth,
        imageLocal.naturalHeight,
      );

      texture.value = PIXI.Texture.from(canvas);
    };
  }
});

onUnmounted(() => {
  texture.value?.destroy();
});
</script>

<template>
  <Container event-mode="none">
    <Graphics
      event-mode="none"
      @render="
        renderTorso(
          $event,
          isComponent ? nodeBackgroundColors.Component : backgroundColor,
        )
      "
    />

    <Graphics
      v-if="isComponent && type"
      event-mode="none"
      :scale="componentBackgroundPortion"
      :x="4"
      :y="4"
      @render="renderTorso($event, backgroundColor)"
    />

    <Sprite
      v-if="texture"
      event-mode="none"
      label="NodeIcon"
      :texture="texture as any"
      :anchor="0.5"
      :scale="nodeIconScaleFactor"
      :x="$shapes.nodeSize / 2"
      :y="$shapes.nodeSize / 2"
    />
  </Container>
</template>
