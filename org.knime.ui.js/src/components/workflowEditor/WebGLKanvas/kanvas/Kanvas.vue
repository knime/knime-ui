<script setup lang="ts">
import {
  type Ref,
  computed,
  onMounted,
  onUnmounted,
  ref,
  useTemplateRef,
  watch,
} from "vue";
import { useDevicePixelRatio } from "@vueuse/core";
import { storeToRefs } from "pinia";
import { type Container, RenderLayer } from "pixi.js";
import { Application as VuePixiApplication } from "vue3-pixi";

import { performanceTracker } from "@/performanceTracker";
import { $bus } from "@/plugins/event-bus";
import { useCanvasModesStore } from "@/store/application/canvasModes";
import { useApplicationSettingsStore } from "@/store/application/settings";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useSettingsStore } from "@/store/settings";
import { getKanvasDomElement } from "@/util/getKanvasDomElement";
import Debug from "../Debug.vue";
import { clearIconCache } from "../common/iconCache";
import { initE2ETestUtils } from "../util/e2eTest";
import { isMarkedEvent } from "../util/interaction";

import Minimap from "./Minimap.vue";
import { useKanvasNodePortHint } from "./useKanvasNodePortHint";
import { useMouseWheel } from "./useMouseWheel";
import { useCanvasPanning } from "./usePanning";

const pixiApp = ref<VuePixiApplication>();

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

const isPixiAppInitialized = ref(false);

const MAIN_CONTAINER_LABEL = "MainContainer";
const { devMode } = storeToRefs(useApplicationSettingsStore());

const addRenderLayers = (app: VuePixiApplication["app"]) => {
  let layerIndex = 0;

  const debugLayer = new RenderLayer();
  // @ts-expect-error type misses label
  debugLayer.label = "DebugLayer";
  app.stage.addChildAt(debugLayer, layerIndex++);
  canvasLayers.value.debugLayer = debugLayer;

  // annotations need to be behind everything else
  const annotationsLayer = new RenderLayer({ sortableChildren: true });
  // @ts-expect-error type misses label
  annotationsLayer.label = "AnnotationsLayer";

  app.stage.addChildAt(annotationsLayer, layerIndex++);
  canvasLayers.value.annotations = annotationsLayer;

  // add a layer so we can move the selection plane of the nodes to the back
  const nodeSelectionPlaneRenderLayer = new RenderLayer();
  // @ts-expect-error type misses label
  nodeSelectionPlaneRenderLayer.label = "NodeSelectionPlaneRenderLayer";

  app.stage.addChildAt(nodeSelectionPlaneRenderLayer, layerIndex++);
  canvasLayers.value.nodeSelectionPlane = nodeSelectionPlaneRenderLayer;
};

const mainContainer = useTemplateRef<Container>("mainContainer");

watch(mainContainer, (value) => {
  if (value !== null) {
    canvasStore.stage = mainContainer.value;
    emit("canvasReady");
  }
});

onMounted(() => {
  // Store reference Pixi.js application instance
  const app = pixiApp.value!.app;
  console.log(
    "pixiApp.value",
    pixiApp.value,
    "mainContainer.value",
    mainContainer.value,
  );

  if (!import.meta.env.PROD || devMode.value) {
    globalThis.__PIXI_APP__ = app;
  }

  canvasStore.pixiApplication = pixiApp.value as VuePixiApplication;

  // used by e2e tests in this repo and by QA
  globalThis.__E2E_TEST__ = initE2ETestUtils(app);

  canvasStore.isDebugModeEnabled = import.meta.env.VITE_CANVAS_DEBUG === "true";

  performanceTracker.trackSingleRender(pixiApp.value!);
});

useKanvasNodePortHint(isPixiAppInitialized);

onUnmounted(() => {
  canvasStore.pixiApplication = null;
  canvasStore.removeLayers();
  canvasStore.stage = null;
  canvasStore.clearCanvasAnchor();
  canvasStore.setCanvasOffset({ x: 0, y: 0 });
  canvasStore.setFactor(1);
  clearIconCache();
});

const { hasPanModeEnabled } = storeToRefs(useCanvasModesStore());
const { mousePan, scrollPan, shouldShowMoveCursor } = useCanvasPanning({
  pixiApp: pixiApp as NonNullable<Ref<VuePixiApplication>>,
});

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

// before the mount the pixi app is already there so we can add the layers and make sure they are available early
const beforePixiMount = (app: VuePixiApplication["app"]) => {
  addRenderLayers(app);
};

const kanvasElement = getKanvasDomElement()!;
</script>

<template>
  <VuePixiApplication
    ref="pixiApp"
    :background-color="0x000000"
    :background-alpha="0"
    :width="containerSize.width"
    :height="containerSize.height"
    :resolution="pixelRatio"
    :auto-density="true"
    :antialias="true"
    :resize-to="kanvasElement"
    :auto-start="!performanceTracker.isCanvasPerfMode()"
    :on-before-mount="beforePixiMount"
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
  >
    <Container
      ref="mainContainer"
      :label="MAIN_CONTAINER_LABEL"
      :event-mode="interactionsEnabled === 'all' ? undefined : 'none'"
    >
      <Debug :visible="isCanvasDebugEnabled" />
      <slot />
    </Container>

    <Minimap v-if="isMinimapVisible && !shouldHideMiniMap" />
  </VuePixiApplication>
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
