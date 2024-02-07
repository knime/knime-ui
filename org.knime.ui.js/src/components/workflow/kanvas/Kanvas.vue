<script lang="ts">
export const RESIZE_DEBOUNCE = 100;
</script>

<script setup lang="ts">
import type { Ref } from "vue";
import {
  onMounted,
  watch,
  computed,
  ref,
  nextTick,
  onBeforeUnmount,
} from "vue";
import { debounce } from "lodash-es";
import { getMetaOrCtrlKey } from "webapps-common/util/navigator";
import { useStore } from "@/composables/useStore";
import { $bus } from "@/plugins/event-bus";
import { useMouseWheelZooming } from "./useMouseWheelZooming";
import { usePanning } from "./usePanning";
import { useCanvasMoveLocking } from "./useCanvasMoveLocking";
import { useArrowKeyNavigation } from "./useArrowKeyNavigation";

const emit = defineEmits(["containerSizeChanged"]);

const store = useStore();

// canvas
const interactionsEnabled = computed(
  () => store.state.canvas.interactionsEnabled,
);
const canvasSize = computed(() => store.getters["canvas/canvasSize"]);
const viewBox = computed(() => store.getters["canvas/viewBox"]);
const contentBounds = computed(() => store.getters["canvas/contentBounds"]);

watch(contentBounds, (...args) => {
  store.dispatch("canvas/contentBoundsChanged", args);
});

// application
const hasPanModeEnabled = computed(
  () => store.getters["application/hasPanModeEnabled"],
);

// workflow
const isWorkflowEmpty = computed(
  () => store.getters["workflow/isWorkflowEmpty"],
);

const rootEl = ref<HTMLDivElement | null>(null);
let resizeObserver: ResizeObserver, stopResizeObserver: () => void;

const initResizeObserver = () => {
  // updating the container size and recalculating the canvas is debounced.
  const updateContainerSize = debounce(() => {
    store.dispatch("canvas/updateContainerSize");
    nextTick(() => {
      emit("containerSizeChanged");
    });
  }, RESIZE_DEBOUNCE);

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

  resizeObserver.observe(rootEl.value!);
};

onMounted(() => {
  store.dispatch("canvas/initScrollContainerElement", rootEl.value);
  initResizeObserver();

  rootEl.value!.focus();
});

onBeforeUnmount(() => {
  // Stop Resize Observer
  stopResizeObserver();

  // Remove reference to canvas element wrapper
  store.commit("canvas/clearScrollContainerElement");
});

useCanvasMoveLocking();

const { onMouseWheel } = useMouseWheelZooming({
  rootEl: rootEl as Ref<HTMLElement>,
});

const { shouldShowMoveCursor, beginPan, movePan, stopPan, isHoldingDownSpace } =
  usePanning({
    rootEl: rootEl as Ref<HTMLElement>,
  });

useArrowKeyNavigation({ isHoldingDownSpace });

const startRectangleSelection = (event: PointerEvent) => {
  const metaOrCtrlKey = getMetaOrCtrlKey();

  if (event.shiftKey || event[metaOrCtrlKey]) {
    $bus.emit("selection-pointerdown", event);
  }
};
</script>

<template>
  <div
    ref="rootEl"
    tabindex="0"
    :class="[
      'scroll-container',
      {
        panning: shouldShowMoveCursor || hasPanModeEnabled,
        empty: isWorkflowEmpty,
        disabled: !interactionsEnabled,
      },
    ]"
    @wheel="onMouseWheel"
    @pointerdown.middle="beginPan"
    @pointerdown.prevent.right="beginPan"
    @pointerdown.left="beginPan"
    @pointerup.middle="stopPan"
    @pointerup.left="stopPan"
    @pointerup.prevent.right="stopPan"
    @pointermove="movePan"
  >
    <svg
      ref="svg"
      :width="canvasSize.width"
      :height="canvasSize.height"
      :viewBox="viewBox.string"
      @pointerdown.left.exact.stop="$bus.emit('selection-pointerdown', $event)"
      @pointerdown.left.stop="startRectangleSelection"
      @pointerup.left.stop="$bus.emit('selection-pointerup', $event)"
      @pointermove="$bus.emit('selection-pointermove', $event)"
      @lostpointercapture="$bus.emit('selection-lostpointercapture', $event)"
    >
      <slot />
    </svg>
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
  overflow: scroll;
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
