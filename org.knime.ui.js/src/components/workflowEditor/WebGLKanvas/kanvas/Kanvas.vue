<script setup lang="ts">
import {
  type Ref,
  computed,
  onUnmounted,
  ref,
  useTemplateRef,
  watch,
} from "vue";
import { useDevicePixelRatio } from "@vueuse/core";
import { storeToRefs } from "pinia";
import { Container, RenderLayer } from "pixi.js";

import { performanceTracker } from "@/performanceTracker";
import { $bus } from "@/plugins/event-bus";
import { useCanvasModesStore } from "@/store/application/canvasModes";
import { useApplicationSettingsStore } from "@/store/application/settings";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useSettingsStore } from "@/store/settings";
import { getKanvasDomElement } from "@/util/getKanvasDomElement";
import { Application, type ApplicationInst } from "@/vue3-pixi";
import Debug from "../Debug.vue";
import { clearIconCache } from "../common/iconCache";
import { initE2ETestUtils } from "../util/e2eTest";

import Minimap from "./Minimap.vue";
import { useMouseWheel } from "./useMouseWheel";
import { useCanvasPanning } from "./usePanning";

const pixiApp = ref<ApplicationInst>();

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

const addRenderLayers = (app: ApplicationInst["app"]) => {
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

watch(
  isPixiAppInitialized,
  () => {
    if (!isPixiAppInitialized.value) {
      return;
    }

    // Store reference Pixi.js application instance
    const app = pixiApp.value!.app;

    if (!import.meta.env.PROD || devMode.value) {
      globalThis.__PIXI_APP__ = app;
    }

    canvasStore.pixiApplication = pixiApp.value as ApplicationInst;
    canvasStore.stage = mainContainer.value;

    // used by e2e tests in this repo and by QA
    globalThis.__E2E_TEST__ = initE2ETestUtils(app);

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

const { hasPanModeEnabled } = storeToRefs(useCanvasModesStore());
const { mousePan, scrollPan, shouldShowMoveCursor } = useCanvasPanning({
  pixiApp: pixiApp as NonNullable<Ref<ApplicationInst>>,
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
  if (event.dataset) {
    return;
  }

  isGrabbing.value = true;
  mousePan(event);
};

const onPointerUp = (event: PointerEvent) => {
  isGrabbing.value = false;
  $bus.emit("selection-pointerup", event);
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
const beforePixiMount = (app: ApplicationInst["app"]) => {
  addRenderLayers(app);
};
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
    :on-before-mount="beforePixiMount"
    :class="[
      {
        panning: shouldShowMoveCursor || hasPanModeEnabled,
        grabbing: isGrabbing,
      },
    ]"
    @wheel.prevent="onMouseWheel"
    @pointerdown="onPointerDown"
    @pointermove="$bus.emit('selection-pointermove', $event)"
    @pointerup="onPointerUp"
    @contextmenu.prevent
    @init-complete="isPixiAppInitialized = true"
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
