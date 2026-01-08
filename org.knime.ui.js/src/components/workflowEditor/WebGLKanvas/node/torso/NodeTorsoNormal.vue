<!-- eslint-disable no-magic-numbers -->
<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import * as PIXI from "pixi.js";

import {
  type NativeNodeInvariants,
  Node,
} from "@/api/gateway-api/generated-api";
import type { GraphicsInst } from "@/vue3-pixi";
import {
  nodeBackgroundColor,
  nodeColorFromType,
} from "../../util/nodeBackgroundColor";

import { torsoDrawUtils } from "./drawUtils";

const componentBackgroundPortion = 0.75;

type Props = {
  nodeId: string;
  kind: Node.KindEnum;
  icon: string | null;
  type: NativeNodeInvariants.TypeEnum | null;
};

const props = defineProps<Props>();

const isComponent = computed(() => props.kind === Node.KindEnum.Component);

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
  const draw = renderFunctionMapper[props.type!] ?? torsoDrawUtils.drawDefault;
  draw(graphics);
  graphics.closePath();
  graphics.fill(backgroundColor);
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

    <Graphics
      v-if="isComponent && type"
      label="NodeTorsoNormalComponentBackground"
      event-mode="none"
      :scale="componentBackgroundPortion"
      :x="4"
      :y="4"
      @render="renderTorso($event, nodeColorFromType(type))"
    />

    <Sprite
      v-if="texture"
      label="NodeTorsoNormalIcon"
      event-mode="none"
      :texture="texture as any"
      :anchor="0.5"
      :scale="nodeIconScaleFactor"
      :x="$shapes.nodeSize / 2"
      :y="$shapes.nodeSize / 2"
    />
  </Container>
</template>
