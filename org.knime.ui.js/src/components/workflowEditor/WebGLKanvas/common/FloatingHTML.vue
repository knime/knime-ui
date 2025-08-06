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

type TransformValue = `${number}px` | `${number}%` | `calc(${any})`;

type Props = {
  active: boolean;
  canvasPosition: XY | undefined;
  transformOffsets?: {
    x?: TransformValue;
    y?: TransformValue;
  };
  dimensions?: { width?: number; height?: number };
};

const props = withDefaults(defineProps<Props>(), {
  transformOffsets: undefined,
  dimensions: undefined,
});

const transformStyle = computed(() => {
  const scale = `scale(${zoomFactor.value})`;
  // prettier-ignore
  const translate = `translate(${props.transformOffsets?.x ?? "0px"}, ${props.transformOffsets?.y ?? "0px"})`

  return props.transformOffsets ? `${scale} ${translate}` : `${scale}`;
});

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
    transform: transformStyle.value,
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
  z-index: v-bind("$zIndices.layerExpandedMenus");
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
