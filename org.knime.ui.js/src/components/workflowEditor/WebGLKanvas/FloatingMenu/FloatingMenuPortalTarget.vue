<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";

/**
 * This component serves as a receiver for the `FloatingMenu` component,
 * which is responsible for the canvas anchoring behavior and must be portalled.
 *
 * Portalling is necessary because, in the WebGL canvas implementation,
 * the anchored container's position in the DOM must be close to the actual `<canvas>`
 * element.
 *
 * Without portalling, this component would reside elsewhere in the DOM due to the
 * component hierarchy, leading to incorrect positioning calculations.
 */

const { zoomFactor, canvasAnchor, canvasOffset } = storeToRefs(
  useWebGLCanvasStore(),
);

/**
 * Transform the position of the container based on factors such as:
 * - The known anchor position (X,Y), e.g: where the user interacted with a canvas object,
 *   which are canvas world coordinates.
 * - The canvas (X,Y) offset
 * - The zoom factor
 */
const position = computed(() => {
  return {
    x:
      (canvasAnchor.value.anchor.x + canvasOffset.value.x / zoomFactor.value) *
      zoomFactor.value,
    y:
      (canvasAnchor.value.anchor.y + canvasOffset.value.y / zoomFactor.value) *
      zoomFactor.value,
  };
});
</script>

<template>
  <div
    v-if="canvasAnchor.isOpen"
    class="wrapper"
    :style="{
      left: `${position.x}px`,
      top: `${position.y}px`,
    }"
  >
    <PortalTarget tag="div" name="canvas-anchored-container" />
  </div>
</template>

<style lang="postcss" scoped>
.wrapper {
  position: absolute;
}
</style>
