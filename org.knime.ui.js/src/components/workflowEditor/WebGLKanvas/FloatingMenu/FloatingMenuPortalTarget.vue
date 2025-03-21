<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { CANVAS_ANCHOR_WRAPPER_ID } from "../../CanvasAnchoredComponents";

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

const canvasStore = useWebGLCanvasStore();
const { canvasAnchor } = storeToRefs(canvasStore);

const screenPosition = computed(() =>
  canvasStore.screenFromCanvasCoordinates(canvasAnchor.value.anchor),
);

const style = computed(() => {
  const { placement = "top-left" } = canvasAnchor.value;
  const baseStyles = {
    left: `${screenPosition.value.x}px`,
    top: `${screenPosition.value.y}px`,
  };

  return placement === "top-left"
    ? baseStyles
    : { ...baseStyles, transform: "translateX(-100%)" };
});
</script>

<template>
  <div
    v-if="canvasAnchor.isOpen"
    :id="CANVAS_ANCHOR_WRAPPER_ID"
    class="floating-menu-portal"
    :style="style"
  >
    <PortalTarget tag="div" name="canvas-anchored-container" />
  </div>
</template>

<style lang="postcss" scoped>
.floating-menu-portal {
  position: fixed;
  z-index: v-bind("$zIndices.webGlCanvasFloatingMenus");
}
</style>
