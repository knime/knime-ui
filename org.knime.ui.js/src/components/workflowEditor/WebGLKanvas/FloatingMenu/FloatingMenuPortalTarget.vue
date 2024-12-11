<script setup lang="ts">
import { computed } from "vue";
import type { Store } from "vuex";

import type { RootStoreState } from "@/store/types";

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

declare let store: Store<RootStoreState>;

const zoomFactor = computed(() => store.state.canvasWebGL.zoomFactor);
const canvasAnchor = computed(() => store.state.canvasWebGL.canvasAnchor);

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
      (canvasAnchor.value.anchor.x +
        store.state.canvasWebGL.canvasOffset.x / zoomFactor.value) *
      zoomFactor.value,
    y:
      (canvasAnchor.value.anchor.y +
        store.state.canvasWebGL.canvasOffset.y / zoomFactor.value) *
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
