<script setup lang="ts">
import { type Ref, onUnmounted, ref, watch } from "vue";
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
  pixelRatio,
} = storeToRefs(canvasStore);

const isPixiAppInitialized = ref(false);

const MAIN_CONTAINER_LABEL = "MainContainer";

const addRenderLayers = (app: ApplicationInst["app"]) => {
  // annotations need to be behind everything else
  const annotationsLayer = new RenderLayer({ sortableChildren: true });
  // @ts-expect-error type misses label
  annotationsLayer.label = "AnnotationsLayer";

  app.stage.addChildAt(annotationsLayer, 0);
  canvasLayers.value.annotations = annotationsLayer;

  // add a layer so we can move the selection plane of the nodes to the back
  const nodeSelectionPlaneRenderLayer = new RenderLayer();
  // @ts-expect-error type misses label
  nodeSelectionPlaneRenderLayer.label = "NodeSelectionPlaneRenderLayer";

  app.stage.addChildAt(nodeSelectionPlaneRenderLayer, 1);
  canvasLayers.value.nodeSelectionPlane = nodeSelectionPlaneRenderLayer;
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
    canvasStore.pixiApplication = pixiApp.value as ApplicationInst;
    canvasStore.stage = app.stage;

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

const { pixelRatio: devicePixelRatio } = useDevicePixelRatio();
watch(
  devicePixelRatio,
  (value) => {
    canvasStore.setPixelRatio(value);
  },
  { immediate: true },
);

// before the mount the pixi app is already there so we can add the layers and make sure they are available early
const beforePixiMount = (app: ApplicationInst["app"]) => {
  addRenderLayers(app);
};
</script>

<template>
  <Application
    ref="pixiApp"
    :background-color="0xffffff"
    :width="containerSize.width"
    :height="containerSize.height"
    :resolution="pixelRatio"
    :auto-density="true"
    :antialias="true"
    :resize-to="() => getKanvasDomElement()!"
    :auto-start="!performanceTracker.isCanvasPerfMode()"
    :on-before-mount="beforePixiMount"
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
