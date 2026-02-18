<script setup lang="ts">
import { computed, onUnmounted, ref, useTemplateRef, watch } from "vue";
import { useDevicePixelRatio } from "@vueuse/core";
import { storeToRefs } from "pinia";
import {
  Container,
  Application as PixiApplication,
  RenderLayer,
} from "pixi.js";

import { getKanvasDomElement } from "@/lib/workflow-canvas";
import { performanceTracker } from "@/performanceTracker";
import { $bus } from "@/plugins/event-bus";
import { useCanvasModesStore } from "@/store/application/canvasModes";
import { useApplicationSettingsStore } from "@/store/application/settings";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useSettingsStore } from "@/store/settings";
import { Application, type ApplicationInst } from "@/vue3-pixi";
import Debug from "../Debug.vue";
import { clearIconCache } from "../common/iconCache";
import { pixiGlobals } from "../common/pixiGlobals";
import { initE2ETestUtils } from "../util/e2eTest";
import { isMarkedEvent } from "../util/interaction";

import Minimap from "./Minimap.vue";
import { useKanvasNodePortHint } from "./useKanvasNodePortHint";
import { useMouseWheel } from "./useMouseWheel";
import { useCanvasPanning } from "./usePanning";

const emit = defineEmits<{
  canvasReady: [];
}>();

const canvasStore = useWebGLCanvasStore();
const {
  shouldHideMiniMap,
  containerSize,
  isDebugModeEnabled: isCanvasDebugEnabled,
  canvasLayers,
  pixelRatio,
  interactionsEnabled,
  isHoldingDownSpace,
} = storeToRefs(canvasStore);

const isMinimapVisible = computed(
  () => useSettingsStore().settings.isMinimapVisible,
);

const MAIN_CONTAINER_LABEL = "MainContainer";
const { devMode } = storeToRefs(useApplicationSettingsStore());

// before the mount the pixi app is already there so we can add the layers
// and make sure they are available early
const addRenderLayers = (app: ApplicationInst["app"]) => {
  let layerIndex = 0;

  const debugLayer = new RenderLayer();
  debugLayer.label = "DebugLayer";
  app.stage.addChildAt(debugLayer, layerIndex++);
  canvasLayers.value.debugLayer = debugLayer;

  // annotations need to be behind everything else
  const annotationsLayer = new RenderLayer({ sortableChildren: true });
  annotationsLayer.label = "AnnotationsLayer";

  app.stage.addChildAt(annotationsLayer, layerIndex++);
  canvasLayers.value.annotations = annotationsLayer;

  // add a layer so we can move the selection plane of the nodes to the back
  const nodeSelectionPlaneRenderLayer = new RenderLayer();
  nodeSelectionPlaneRenderLayer.label = "NodeSelectionPlaneRenderLayer";

  app.stage.addChildAt(nodeSelectionPlaneRenderLayer, layerIndex++);
  canvasLayers.value.nodeSelectionPlane = nodeSelectionPlaneRenderLayer;
};

const mainContainer = useTemplateRef<Container>("mainContainer");
const { initializeHint } = useKanvasNodePortHint();

const onAppInitialized = (pixiApp: PixiApplication) => {
  if (!import.meta.env.PROD || devMode.value) {
    // this allows the pixi devtools to work
    globalThis.__PIXI_APP__ = pixiApp;
  }

  pixiGlobals.setApplicationInstance(pixiApp);
  pixiGlobals.setMainContainer(mainContainer.value!);

  // used by e2e tests in this repo and by QA
  globalThis.__E2E_TEST__ = initE2ETestUtils();

  canvasStore.isDebugModeEnabled = import.meta.env.VITE_CANVAS_DEBUG === "true";

  emit("canvasReady");

  // only enable for FE e2e Playwright tests
  if (import.meta.env.MODE === "e2e") {
    performanceTracker.trackSingleRender(pixiApp);
  }

  initializeHint();
};

onUnmounted(() => {
  canvasStore.canvasOffset = { x: 0, y: 0 };
  canvasStore.zoomFactor = 1;

  canvasStore.removeLayers();
  canvasStore.clearCanvasAnchor();
  pixiGlobals.clear();
  clearIconCache();
});

const { hasPanModeEnabled } = storeToRefs(useCanvasModesStore());
const { mousePan, scrollPan, shouldShowMoveCursor } = useCanvasPanning();

const isGrabbing = ref(false);
const onPointerDown = (event: PointerEvent) => {
  if (interactionsEnabled.value === "none") {
    return;
  }

  const isMouseLeftClick = event.button === 0;

  if (
    !isHoldingDownSpace.value &&
    isMouseLeftClick &&
    interactionsEnabled.value === "all"
  ) {
    $bus.emit("selection-pointerdown", event);
    return;
  }

  // if any canvas object has marked this event as handled, then we ignore panning
  if (isMarkedEvent(event)) {
    return;
  }

  isGrabbing.value = true;
  mousePan(event);
};

const onPointerUp = () => {
  isGrabbing.value = false;
};

const { onMouseWheel } = useMouseWheel({ scrollPan });

const { pixelRatio: devicePixelRatio } = useDevicePixelRatio();
watch(
  devicePixelRatio,
  (value) => {
    canvasStore.setPixelRatio(value);
  },
  { immediate: true },
);
</script>

<template>
  <Application
    ref="pixiApp"
    :background-color="0x000000"
    :background-alpha="0"
    :width="containerSize.width"
    :height="containerSize.height"
    :resolution="pixelRatio"
    :auto-density="true"
    :antialias="true"
    :resize-to="() => getKanvasDomElement()!"
    :auto-start="!performanceTracker.isCanvasPerfMode()"
    :class="[
      {
        panning: shouldShowMoveCursor || hasPanModeEnabled,
        grabbing: isGrabbing,
      },
    ]"
    @wheel.prevent="onMouseWheel"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @contextmenu.prevent
    @before-mount="addRenderLayers"
    @init-complete="onAppInitialized"
  >
    <Container
      ref="mainContainer"
      :label="MAIN_CONTAINER_LABEL"
      :event-mode="interactionsEnabled === 'all' ? undefined : 'none'"
    >
      <Debug v-if="devMode" :visible="isCanvasDebugEnabled" />
      <slot />
    </Container>

    <Minimap v-if="isMinimapVisible && !shouldHideMiniMap" />
  </Application>
</template>

<style scoped lang="postcss">
/*
  Pixi sets an inline style for the cursor property which we have no control
  over. So we have to bypass CSS specificity with an !important, for both panning
  states
*/
.panning:not(.grabbing) {
  cursor: grab !important;
}

.grabbing {
  cursor: grabbing !important;
}
</style>
