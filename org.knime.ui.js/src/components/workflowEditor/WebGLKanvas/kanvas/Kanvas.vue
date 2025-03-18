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
import { RenderLayer } from "pixi.js";

import { $bus } from "@/plugins/event-bus";
import { useCanvasStateTrackingStore } from "@/store/application/canvasStateTracking";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { KANVAS_ID, getKanvasDomElement } from "@/util/getKanvasDomElement";
import { Application, type ApplicationInst } from "@/vue3-pixi";
import { useArrowKeyNavigation } from "../../useArrowKeyNavigation";
import Debug from "../Debug.vue";
import { clearIconCache } from "../common/iconCache";

import { useMouseWheel } from "./useMouseWheel";
import { useCanvasPanning } from "./usePanning";

const pixiApp = ref<ApplicationInst>();

// TODO: How to use devicePixelRatio to improve resolution w/o affecting
// offset calculations for events (panning, zooming, etc). Causes issues on Mac

const canvasStore = useWebGLCanvasStore();
const {
  containerSize,
  isDebugModeEnabled: isCanvasDebugEnabled,
  canvasLayers,
} = storeToRefs(canvasStore);

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

const MAIN_CONTAINER_LABEL = "MainContainer";

const addBackgroundRenderLayer = (app: ApplicationInst["app"]) => {
  // add a background layer so we can move the selection plane of the nodes all the way
  // to the back
  const backgroundRenderLayer = new RenderLayer();
  // @ts-expect-error
  backgroundRenderLayer.label = "BackgroundRenderLayer";

  app.stage.addChildAt(backgroundRenderLayer, 0);
  canvasLayers.value.background = backgroundRenderLayer;
};

watch(
  isPixiAppInitialized,
  async () => {
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

    addBackgroundRenderLayer(app);

    canvasStore.isDebugModeEnabled =
      import.meta.env.VITE_CANVAS_DEBUG === "true";

    if (!(await useCanvasStateTrackingStore().restoreCanvasState())) {
      // just fill screen if we did not find a saved state
      canvasStore.fillScreen();
    }
  },
  { once: true },
);

onBeforeUnmount(() => {
  stopResizeObserver?.();
});

onUnmounted(() => {
  canvasStore.pixiApplication = null;
  canvasStore.removeLayers();
  canvasStore.stage = null;
  clearIconCache();
});

const { mousePan, scrollPan } = useCanvasPanning({
  pixiApp: pixiApp as NonNullable<Ref<ApplicationInst>>,
});

const { onMouseWheel } = useMouseWheel({ scrollPan });
</script>

<template>
  <div :id="KANVAS_ID" ref="rootEl" tabindex="0" class="scroll-container">
    <Application
      ref="pixiApp"
      :background-color="0xffffff"
      :width="containerSize.width"
      :height="containerSize.height"
      :resolution="1.25"
      :auto-density="true"
      :antialias="true"
      :resize-to="() => getKanvasDomElement()!"
      @wheel.prevent="onMouseWheel"
      @pointerdown.left="$bus.emit('selection-pointerdown', $event)"
      @pointermove="$bus.emit('selection-pointermove', $event)"
      @pointerup="$bus.emit('selection-pointerup', $event)"
      @contextmenu.prevent
      @pointerdown.right="mousePan"
      @pointerdown.middle="mousePan"
      @init-complete="isPixiAppInitialized = true"
    >
      <Container :label="MAIN_CONTAINER_LABEL">
        <Debug v-if="isCanvasDebugEnabled" />
        <slot />
      </Container>
    </Application>
  </div>
</template>

<style lang="postcss" scoped>
.scroll-container {
  overflow: hidden;
  height: 100%;
  width: 100%;

  &:focus {
    outline: none;
  }
}
</style>
