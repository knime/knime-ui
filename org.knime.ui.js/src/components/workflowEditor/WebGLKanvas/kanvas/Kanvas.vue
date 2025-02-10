<script setup lang="ts">
import { type Ref, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { debounce } from "lodash-es";
import { storeToRefs } from "pinia";
import throttle from "raf-throttle";
import { Application, type ApplicationInst, type StageInst } from "vue3-pixi";

import { $bus } from "@/plugins/event-bus";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { KANVAS_ID } from "@/util/getKanvasDomElement";
import Debug from "../Debug.vue";
import FloatingMenuPortalTarget from "../FloatingMenu/FloatingMenuPortalTarget.vue";

import { useCanvasPanning } from "./usePanning";

const pixiApp = ref<ApplicationInst>();

// TODO: How to use devicePixelRatio to improve resolution w/o affecting
// offset calculations for events (panning, zooming, etc). Causes issues on Mac

const canvasStore = useWebGLCanvasStore();
const { containerSize, isDebugModeEnabled: isCanvasDebugEnabled } =
  storeToRefs(canvasStore);

const isReady = ref(false);

const zoom = throttle(function (event: WheelEvent) {
  const shouldZoom = event.ctrlKey;
  if (!shouldZoom) {
    return;
  }

  canvasStore.zoomAroundPointer({
    cursorX: event.offsetX,
    cursorY: event.offsetY,
    delta: Math.sign(-event.deltaY) as -1 | 0 | 1,
  });
});

const rootEl = ref<HTMLElement | null>(null);

let resizeObserver: ResizeObserver, stopResizeObserver: () => void;

const initResizeObserver = () => {
  if (!rootEl.value) {
    return;
  }

  // updating the container size and recalculating the canvas is debounced.
  const updateContainerSize = debounce(() => {
    canvasStore.updateContainerSize();
  }, 100);

  resizeObserver = new ResizeObserver((entries) => {
    const containerEl = entries.find(({ target }) => target === rootEl.value);
    if (containerEl) {
      updateContainerSize();
    }
  });

  stopResizeObserver = () => {
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
  };

  resizeObserver.observe(rootEl.value);
};

onMounted(() => {
  canvasStore.initScrollContainerElement(rootEl.value!);
  rootEl.value!.focus();

  // Store reference Pixi.js application instance
  const app = pixiApp.value!.app;
  globalThis.__PIXI_APP__ = app;

  canvasStore.pixiApplication = pixiApp.value as ApplicationInst;

  // Store reference to the Pixi.js Stage
  // https://pixijs.com/7.x/guides/basics/getting-started#adding-the-sprite-to-the-stage
  canvasStore.stage = app.stage as StageInst;

  canvasStore.isDebugModeEnabled = import.meta.env.VITE_CANVAS_DEBUG === "true";

  nextTick(() => {
    isReady.value = true;
  });

  initResizeObserver();
});

onBeforeUnmount(() => {
  stopResizeObserver?.();
});

const { beginPan } = useCanvasPanning({
  pixiApp: pixiApp as NonNullable<Ref<ApplicationInst>>,
});
</script>

<template>
  <div :id="KANVAS_ID" ref="rootEl" tabindex="0" class="scroll-container">
    <FloatingMenuPortalTarget v-if="isReady" />

    <Application
      ref="pixiApp"
      :background-color="0xffffff"
      :width="containerSize.width"
      :height="containerSize.height"
      :resolution="1"
      @wheel.prevent="zoom"
      @pointerdown.left="$bus.emit('selection-pointerdown', $event)"
      @pointermove="$bus.emit('selection-pointermove', $event)"
      @pointerup="$bus.emit('selection-pointerup', $event)"
      @contextmenu.prevent
      @pointerdown.right="beginPan"
      @pointerdown.middle="beginPan"
    >
      <Container name="contentBounds">
        <Debug v-if="isCanvasDebugEnabled" />
        <slot />
      </Container>
    </Application>
  </div>
</template>

<style lang="postcss" scoped>
.scroll-container {
  position: relative;
  overflow: hidden;
  height: 100%;
  width: 100%;

  &:focus {
    outline: none;
  }
}
</style>
