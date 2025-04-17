<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import type { XY } from "@/api/gateway-api/generated-api";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";

import { FLOATING_HTML_FADE_DELAY_MS } from "./constants";

/**
 * Component that allows HTML content to be "floated" atop
 * the canvas, anchored at a specific canvas position and
 * keeping into account the canvas translated position and zoom factor
 */

const canvasStore = useWebGLCanvasStore();
const { zoomFactor } = storeToRefs(canvasStore);

type Props = {
  active: boolean;
  canvasPosition?: XY;
  dimensions?: { width?: number; height?: number };
};

const props = defineProps<Props>();

const screenPosition = computed(() => {
  if (!props.canvasPosition) {
    return undefined;
  }

  const [x, y] = canvasStore.fromCanvasCoordinates([
    props.canvasPosition.x,
    props.canvasPosition.y,
  ]);

  return { x, y };
});

const dimensions = computed(() => {
  const { width, height } = props.dimensions ?? {};

  return {
    width: width ? `${width}px` : undefined,
    height: height ? `${height}px` : undefined,
  };
});

const style = computed(() => {
  if (!screenPosition.value) {
    return {};
  }

  const { width, height } = dimensions.value;

  return {
    left: `${screenPosition.value.x}px`,
    top: `${screenPosition.value.y}px`,
    width,
    height,
  };
});
</script>

<template>
  <Transition name="fade">
    <div v-if="active" class="canvas-floating-html" :style="style">
      <slot />
    </div>
  </Transition>
</template>

<style lang="postcss" scoped>
.canvas-floating-html {
  position: absolute;
  z-index: v-bind("$zIndices.webGlCanvasFloatingMenus");
  transform: scale(v-bind(zoomFactor));
  transform-origin: top left;
}

.fade-leave-active {
  /* add very subtle and fast transition to avoid content flashes
  when the webgl annotation updates its text */
  transition: opacity 0.01s linear;
  transition-delay: v-bind("`${FLOATING_HTML_FADE_DELAY_MS}ms`");
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
