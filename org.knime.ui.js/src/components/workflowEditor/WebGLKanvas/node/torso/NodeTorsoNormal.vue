<!-- eslint-disable no-magic-numbers -->
<script setup lang="ts">
import { onUnmounted, ref, watch } from "vue";
import * as PIXI from "pixi.js";

import {
  type NativeNodeInvariants,
  Node,
} from "@/api/gateway-api/generated-api";
import { nodePillHeight } from "@/style/shapes";
import type { GraphicsInst } from "@/vue3-pixi";
import { nodeBackgroundColor } from "../../util/nodeBackgroundColor";

import { torsoDrawUtils } from "./drawUtils";

type Props = {
  nodeId: string;
  kind: Node.KindEnum;
  icon: string | null;
  type: NativeNodeInvariants.TypeEnum | null;
};

const props = defineProps<Props>();

const renderFunctionMapper = {
  LoopStart: torsoDrawUtils.drawLoopStart,
  LoopEnd: torsoDrawUtils.drawLoopEnd,
  ScopeStart: torsoDrawUtils.drawLoopStart,
  ScopeEnd: torsoDrawUtils.drawLoopEnd,
  VirtualIn: torsoDrawUtils.drawVirtualIn,
  VirtualOut: torsoDrawUtils.drawVirtualOut,
} as const;

const renderTorso = (graphics: GraphicsInst, backgroundColor: string) => {
  graphics.clear();
  const drawFn = renderFunctionMapper[props.type!];
  if (drawFn) {
    // Special node shapes: keep traditional full-color fill on the 32×32 icon
    drawFn(graphics);
    graphics.closePath();
    graphics.fill(backgroundColor);
  } else {
    // Default pill: light background + subtle border + small type-color indicator
    torsoDrawUtils.drawDefault(graphics);
    graphics.closePath();
    graphics.fill("#F8F8F8");
    graphics.stroke({ width: 1, color: "#D0D0D0" });
    // Small filled circle in the left cap as the color indicator
    const capCenter = nodePillHeight / 2;
    graphics.circle(capCenter, capCenter, 10);
    graphics.fill(backgroundColor);
  }
};

const texture = ref<PIXI.Texture>();

const NODE_ICON_SIZE = 16;
const nodeIconScaleFactor = ref(0);

watch(
  () => props.icon,
  () => {
    texture.value?.destroy();

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
  },
  { immediate: true },
);

onUnmounted(() => {
  texture.value?.destroy();
});
</script>

<template>
  <Container label="NodeTorsoNormal" event-mode="none">
    <Graphics
      label="NodeTorsoNormalBackground"
      event-mode="none"
      @render="renderTorso($event, nodeBackgroundColor({ kind, type }))"
    />

    <Sprite
      v-if="texture"
      label="NodeTorsoNormalIcon"
      event-mode="none"
      :texture="texture as any"
      :anchor="0.5"
      :scale="nodeIconScaleFactor"
      :x="$shapes.nodePillHeight / 2"
      :y="$shapes.nodePillHeight / 2"
    />
  </Container>
</template>
