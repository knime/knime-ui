<script setup lang="ts">
import {
  type Ref,
  computed,
  onBeforeUnmount,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from "vue";
import { debounce } from "lodash-es";
import { storeToRefs } from "pinia";
import { Actions } from "pixi-actions";
import throttle from "raf-throttle";

import { $bus } from "@/plugins/event-bus";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { KANVAS_ID, getKanvasDomElement } from "@/util/getKanvasDomElement";
import { Application, type ApplicationInst } from "@/vue3-pixi";
import { useArrowKeyNavigation } from "../../useArrowKeyNavigation";
import Debug from "../Debug.vue";
import FloatingMenuPortalTarget from "../FloatingMenu/FloatingMenuPortalTarget.vue";

import { useCanvasPanning } from "./usePanning";

const pixiApp = ref<ApplicationInst>();

// TODO: How to use devicePixelRatio to improve resolution w/o affecting
// offset calculations for events (panning, zooming, etc). Causes issues on Mac

const canvasStore = useWebGLCanvasStore();
const { containerSize, isDebugModeEnabled: isCanvasDebugEnabled } =
  storeToRefs(canvasStore);

const rootEl = ref<HTMLElement | null>(null);

let resizeObserver: ResizeObserver, stopResizeObserver: () => void;

useArrowKeyNavigation({
  isHoldingDownSpace: computed(() => false),
  rootEl: rootEl as Ref<HTMLElement>,
});

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

const isPixiAppInitialized = ref(false);

onMounted(() => {
  canvasStore.initScrollContainerElement(rootEl.value!);
  rootEl.value!.focus();
  initResizeObserver();
});

watch(
  isPixiAppInitialized,
  () => {
    if (!isPixiAppInitialized.value) {
      return;
    }

    // Store reference Pixi.js application instance
    const app = pixiApp.value!.app;
    globalThis.__PIXI_APP__ = app;

    // Store reference to the Pixi.js Stage.
    // https://pixijs.com/8.x/guides/basics/getting-started#adding-the-sprite-to-the-stage
    canvasStore.pixiApplication = pixiApp.value as ApplicationInst;
    canvasStore.stage = app.stage;

    // eslint-disable-next-line no-magic-numbers
    app.ticker.add((tick) => Actions.tick(tick.deltaTime / 60));
    canvasStore.isDebugModeEnabled =
      import.meta.env.VITE_CANVAS_DEBUG === "true";
  },
  { once: true },
);

onBeforeUnmount(() => {
  stopResizeObserver?.();
});

onUnmounted(() => {
  canvasStore.pixiApplication = null;
  canvasStore.stage = null;
});

const { mousePan, scrollPan } = useCanvasPanning({
  pixiApp: pixiApp as NonNullable<Ref<ApplicationInst>>,
});

const zoom = throttle(function (event: WheelEvent) {
  canvasStore.zoomAroundPointer({
    cursorX: event.offsetX,
    cursorY: event.offsetY,
    delta: Math.sign(-event.deltaY) as -1 | 0 | 1,
  });
});

const onWheelEvent = (event: WheelEvent) => {
  const shouldZoom = event.ctrlKey;
  if (shouldZoom) {
    zoom(event);
    return;
  }

  scrollPan(event);
};
</script>

<template>
  <div :id="KANVAS_ID" ref="rootEl" tabindex="0" class="scroll-container">
    <FloatingMenuPortalTarget v-if="isPixiAppInitialized" />
    <Application
      ref="pixiApp"
      :background-color="0xffffff"
      :width="containerSize.width"
      :height="containerSize.height"
      :resolution="1.25"
      :auto-density="true"
      :antialias="true"
      :resize-to="() => getKanvasDomElement()!"
      @wheel.prevent="onWheelEvent"
      @pointerdown.left="$bus.emit('selection-pointerdown', $event)"
      @pointermove="$bus.emit('selection-pointermove', $event)"
      @pointerup="$bus.emit('selection-pointerup', $event)"
      @contextmenu.prevent
      @pointerdown.right="mousePan"
      @pointerdown.middle="mousePan"
      @init-complete="isPixiAppInitialized = true"
    >
      <Container label="contentBounds">
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
