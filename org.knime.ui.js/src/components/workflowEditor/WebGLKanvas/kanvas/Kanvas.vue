<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { debounce } from "lodash-es";
import throttle from "raf-throttle";
import { Application, type ApplicationInst } from "vue3-pixi";

import { useStore } from "@/composables/useStore";
import { $bus } from "@/plugins/event-bus";
import Debug from "../Debug.vue";
import FloatingMenuPortalTarget from "../FloatingMenu/FloatingMenuPortalTarget.vue";
import { useCanvasPanning } from "../kanvas/useCanvasPanning";

const { devicePixelRatio } = window;

const store = useStore();

const stage = computed(() => store.state.canvasWebGL.stage);
const containerSize = computed(() => store.state.canvasWebGL.containerSize);
const isCanvasDebugEnabled = computed(
  () => store.state.canvasWebGL.isDebugModeEnabled,
);

// prevent browser zoom using mouse wheel
document.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
  },
  { passive: false },
);

const isReady = ref(false);

const zoom = throttle(function (event: WheelEvent) {
  const shouldZoom = event.ctrlKey;
  if (!shouldZoom) {
    return;
  }

  store.dispatch("canvasWebGL/zoomAroundPointer", {
    cursorX: event.offsetX,
    cursorY: event.offsetY,
    delta: Math.sign(-event.deltaY),
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
    store.dispatch("canvasWebGL/updateContainerSize");
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

const pixiApp = ref<ApplicationInst | null>(null);

onMounted(() => {
  store.dispatch("canvasWebGL/initScrollContainerElement", rootEl.value);
  rootEl.value!.focus();

  // Store reference Pixi.js application instance
  const app = pixiApp.value!.app;
  globalThis.__PIXI_APP__ = app;
  store.commit("canvasWebGL/setApp", pixiApp.value);

  // Store reference to the Pixi.js Stage
  // https://pixijs.com/8.x/guides/basics/getting-started#adding-the-sprite-to-the-stage
  store.commit("canvasWebGL/setStage", app.stage);

  // Needed for interactions on the canvas (e.g panning)
  // https://pixijs.com/8.x/guides/components/interaction#event-modes
  stage.value!.eventMode = "static";

  store.commit(
    "canvasWebGL/setIsDebugModeEnabled",
    import.meta.env.VITE_CANVAS_DEBUG === "true",
  );

  nextTick(async () => {
    await store.dispatch("canvasWebGL/updateStageHitArea");
    isReady.value = true;
  });

  initResizeObserver();
});

onBeforeUnmount(() => {
  stopResizeObserver?.();
});

const { beginPan } = useCanvasPanning();
</script>

<template>
  <div
    ref="rootEl"
    tabindex="0"
    :class="['scroll-container']"
    style="position: relative"
  >
    <FloatingMenuPortalTarget v-if="isReady" />

    <Application
      ref="pixiApp"
      :background-color="0xffffff"
      :width="containerSize.width"
      :height="containerSize.height"
      :resolution="devicePixelRatio"
      @wheel="zoom"
      @pointerdown.middle="beginPan"
      @pointerdown.right="beginPan"
      @pointerdown.left="$bus.emit('selection-pointerdown', $event)"
      @pointermove="$bus.emit('selection-pointermove', $event)"
      @pointerup="$bus.emit('selection-pointerup', $event)"
    >
      <container name="contentBounds">
        <Debug v-if="isCanvasDebugEnabled" />
        <slot />
      </container>
    </Application>
  </div>
</template>

<style lang="postcss" scoped>
svg {
  position: relative;

  /* needed for z-index to have effect */
  display: block;
}

.panning {
  cursor: move;

  & svg,
  & svg :deep(*) {
    pointer-events: none !important;
  }
}

.scroll-container {
  position: relative;
  overflow: hidden;
  height: 100%;
  width: 100%;

  &:focus {
    outline: none;
  }

  &.empty {
    overflow: hidden;

    /* disables scrolling */
  }

  &.disabled {
    pointer-events: none !important;

    & svg,
    & svg :deep(*) {
      pointer-events: none !important;
    }
  }
}
</style>
