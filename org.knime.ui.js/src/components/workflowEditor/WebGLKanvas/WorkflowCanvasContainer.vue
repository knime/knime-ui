<script setup lang="ts">
import {
  type Ref,
  computed,
  onMounted,
  onUnmounted,
  useTemplateRef,
} from "vue";
import { debounce } from "lodash-es";
import { storeToRefs } from "pinia";

import { useDragNodeIntoCanvas } from "@/composables/useDragNodeIntoCanvas";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { KANVAS_ID } from "@/util/getKanvasDomElement";
import { useArrowKeyNavigation } from "../useArrowKeyNavigation";

const rootEl = useTemplateRef("rootEl");
const canvasStore = useWebGLCanvasStore();
const { shouldHideMiniMap } = storeToRefs(canvasStore);
const { onDrop, onDragOver } = useDragNodeIntoCanvas();

let resizeObserver: ResizeObserver, stopResizeObserver: () => void;

// Canvas div needs to be focusable to receive keyboard events for navigation, moving objects, Escape handling, etc.
const TAB_INDEX = 0;

const initResizeObserver = () => {
  let minimapVisibilityTimeout: number;
  if (!rootEl.value) {
    return;
  }

  // updating the container size and recalculating the canvas is debounced.
  const updateContainerSize = debounce(() => {
    canvasStore.updateContainerSize();
  }, 100);

  resizeObserver = new ResizeObserver((entries) => {
    const containerEl = entries.find(({ target }) => target === rootEl.value);
    if (!containerEl) {
      return;
    }

    shouldHideMiniMap.value = true;

    if (minimapVisibilityTimeout) {
      clearTimeout(minimapVisibilityTimeout);
    }

    minimapVisibilityTimeout = window.setTimeout(() => {
      shouldHideMiniMap.value = false;
      // eslint-disable-next-line no-magic-numbers
    }, 300);

    updateContainerSize();
  });

  stopResizeObserver = () => {
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
  };

  resizeObserver.observe(rootEl.value);
};

useArrowKeyNavigation({
  isHoldingDownSpace: computed(() => false),
  rootEl: rootEl as Ref<HTMLElement>,
});

onMounted(() => {
  canvasStore.initScrollContainerElement(rootEl.value!);
  rootEl.value!.focus();
  initResizeObserver();
});

onUnmounted(() => {
  stopResizeObserver?.();
});
</script>

<template>
  <div
    :id="KANVAS_ID"
    ref="rootEl"
    :tabindex="TAB_INDEX"
    class="kanvas-container"
    @drop.stop="onDrop"
    @dragover.prevent.stop="onDragOver"
  >
    <slot />
  </div>
</template>

<style lang="postcss" scoped>
.kanvas-container {
  position: relative;
  overflow: hidden;
  height: 100%;
  width: 100%;
  isolation: isolate;

  & :deep(canvas) {
    position: relative;
    z-index: v-bind("$zIndices.layerCanvasSurface");

    /* override z-index added by Pixi's DOMContainer implementation */
    & ~ div:not([class]) {
      isolation: isolate;
      z-index: v-bind("$zIndices.layerCanvasDomContainers") !important;
    }
  }

  &:focus {
    outline: none;
  }
}
</style>
