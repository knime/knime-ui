<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import type { XY } from "@/api/gateway-api/generated-api";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";

const canvasStore = useWebGLCanvasStore();
const { zoomFactor } = storeToRefs(canvasStore);

type Props = {
  position: XY;
};

const props = defineProps<Props>();

const screenPosition = computed(() => {
  if (!props.position) {
    return undefined;
  }

  const [x, y] = canvasStore.fromCanvasCoordinates([
    props.position.x,
    props.position.y,
  ]);

  return { x, y };
});

const style = computed(() => {
  if (!screenPosition.value) {
    return {};
  }

  return {
    left: `${screenPosition.value.x}px`,
    top: `${screenPosition.value.y}px`,
  };
});
</script>

<template>
  <div class="canvas-floating-html" :style="style">
    <slot />
  </div>
</template>

<style lang="postcss" scoped>
.canvas-floating-html {
  position: absolute;
  z-index: v-bind("$zIndices.webGlCanvasFloatingMenus");
  transform: scale(v-bind(zoomFactor));
  transform-origin: top left;
}
</style>
