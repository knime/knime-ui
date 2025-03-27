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
const { canvasAnchor, zoomFactor } = storeToRefs(canvasStore);

const screenPosition = computed(() =>
  canvasStore.screenFromCanvasCoordinates(canvasAnchor.value.anchor),
);

const translateStyle = (
  placement: "top-left" | "top-right",
  offset: number,
) => {
  if (placement === "top-left") {
    return offset === 0
      ? {}
      : {
          transform: `translateX(${offset * zoomFactor.value}px)`,
        };
  }
  // top-right
  return {
    transform:
      offset === 0
        ? "translateX(-100%)"
        : `translateX(calc(-100% + ${offset * zoomFactor.value}px))`,
  };
};

const style = computed(() => {
  const { placement = "top-left", offset = 0 } = canvasAnchor.value;

  return {
    left: `${screenPosition.value.x}px`,
    top: `${screenPosition.value.y}px`,
    ...translateStyle(placement, offset),
  };
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
