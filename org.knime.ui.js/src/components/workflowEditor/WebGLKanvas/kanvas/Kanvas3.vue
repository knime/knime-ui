<script setup lang="ts">
import { onUnmounted, ref, useTemplateRef, watch } from "vue";
import { useDevicePixelRatio } from "@vueuse/core";
import { storeToRefs } from "pinia";
import { Assets, Container, Texture } from "pixi.js";

import { performanceTracker } from "@/performanceTracker";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { getKanvasDomElement } from "@/util/getKanvasDomElement";
import { Application, type ApplicationInst } from "@/vue3-pixi";
import { clearIconCache } from "../common/iconCache";

import { useKanvasNodePortHint } from "./useKanvasNodePortHint";

const pixiApp = ref<ApplicationInst>();

const emit = defineEmits<{
  canvasReady: [];
}>();

const canvasStore = useWebGLCanvasStore();
const { containerSize, pixelRatio } = storeToRefs(canvasStore);

const isPixiAppInitialized = ref(false);

const mainContainer = useTemplateRef<Container>("mainContainer");
const texture = ref<Texture>();

watch(
  isPixiAppInitialized,
  async () => {
    if (!isPixiAppInitialized.value) {
      return;
    }

    // Store reference Pixi.js application instance
    // const app = pixiApp.value!.app;

    // if (!import.meta.env.PROD || devMode.value) {
    //   globalThis.__PIXI_APP__ = app;
    // }

    canvasStore.pixiApplication = pixiApp.value as ApplicationInst;
    canvasStore.stage = mainContainer.value;
    texture.value = await Assets.load("https://pixijs.com/assets/bunny.png");

    // used by e2e tests in this repo and by QA
    // globalThis.__E2E_TEST__ = initE2ETestUtils(app);

    canvasStore.isDebugModeEnabled =
      import.meta.env.VITE_CANVAS_DEBUG === "true";

    emit("canvasReady");

    // performanceTracker.trackSingleRender(pixiApp.value!);
  },
  { once: true },
);

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
    @contextmenu.prevent
    @init-complete="isPixiAppInitialized = true"
  >
    <template v-for="i in 3000" :key="i">
      <Graphics
        @render="
          (graphics) => {
            graphics.clear();
            graphics.rect(50 + i * 10, 50, 20, 20);
            graphics.stroke({ width: 1, color: 'red' });
            graphics.fill(0x000000);
          }
        "
      />

      <Sprite
        v-if="texture"
        event-mode="none"
        :texture="texture as any"
        :anchor="0.5"
        :x="100 + i * 10"
        :y="100"
      />
    </template>
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
