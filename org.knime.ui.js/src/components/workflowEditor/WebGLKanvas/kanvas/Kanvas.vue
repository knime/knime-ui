<script setup lang="ts">
import { type Ref, computed, onUnmounted, ref, watch } from "vue";
import { useDevicePixelRatio } from "@vueuse/core";
import { storeToRefs } from "pinia";
import { RenderLayer } from "pixi.js";

import { performanceTracker } from "@/performanceTracker";
import { $bus } from "@/plugins/event-bus";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { getKanvasDomElement } from "@/util/getKanvasDomElement";
import { Application, type ApplicationInst } from "@/vue3-pixi";
import Debug from "../Debug.vue";
import { clearIconCache } from "../common/iconCache";

import { useMouseWheel } from "./useMouseWheel";
import { useCanvasPanning } from "./usePanning";

const pixiApp = ref<ApplicationInst>();

const emit = defineEmits<{
  canvasReady: [];
}>();

const canvasStore = useWebGLCanvasStore();
const {
  containerSize,
  isDebugModeEnabled: isCanvasDebugEnabled,
  canvasLayers,
} = storeToRefs(canvasStore);

const isPixiAppInitialized = ref(false);

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

    addBackgroundRenderLayer(app);

    canvasStore.isDebugModeEnabled =
      import.meta.env.VITE_CANVAS_DEBUG === "true";

    emit("canvasReady");

    performanceTracker.trackSingleRender(pixiApp.value!);
  },
  { once: true },
);

onUnmounted(() => {
  canvasStore.pixiApplication = null;
  canvasStore.removeLayers();
  canvasStore.stage = null;
  canvasStore.clearCanvasAnchor();
  canvasStore.setCanvasOffset({ x: 0, y: 0 });
  canvasStore.setFactor(1);
  clearIconCache();
});

const { mousePan, scrollPan } = useCanvasPanning({
  pixiApp: pixiApp as NonNullable<Ref<ApplicationInst>>,
});

const { onMouseWheel } = useMouseWheel({ scrollPan });

const { pixelRatio } = useDevicePixelRatio();
const resolution = computed(() => {
  // use lower and upper bounds to avoid too high resolution on high dpi screens (e.g. browser zoom) due to performance impact
  return Math.min(Math.max(pixelRatio.value, 1.25), 2.5); // eslint-disable-line no-magic-numbers
});
</script>

<template>
  <Application
    ref="pixiApp"
    :background-color="0xffffff"
    :width="containerSize.width"
    :height="containerSize.height"
    :resolution="resolution"
    :auto-density="true"
    :antialias="true"
    :resize-to="() => getKanvasDomElement()!"
    :auto-start="!performanceTracker.isCanvasPerfMode()"
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
</template>
