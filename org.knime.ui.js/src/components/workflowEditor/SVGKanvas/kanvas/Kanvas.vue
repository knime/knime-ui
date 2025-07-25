<script setup lang="ts">
import type { Ref } from "vue";
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { debounce } from "lodash-es";
import { storeToRefs } from "pinia";

import { useKeyPressedUntilMouseClick } from "@knime/components";
import { getMetaOrCtrlKey, navigatorUtils } from "@knime/utils";

import { $bus } from "@/plugins/event-bus";
import { useCanvasModesStore } from "@/store/application/canvasModes";
import { useSVGCanvasStore } from "@/store/canvas/canvas-svg";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import { useNodeTemplatesStore } from "@/store/nodeTemplates/nodeTemplates";
import { useSelectionStore } from "@/store/selection";
import { useMovingStore } from "@/store/workflow/moving";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { KANVAS_ID } from "@/util/getKanvasDomElement";
import { useArrowKeyNavigation } from "../../useArrowKeyNavigation";

import { RESIZE_DEBOUNCE } from "./constants";
import { useCanvasMoveLocking } from "./useCanvasMoveLocking";
import { useKanvasContextMenu } from "./useKanvasContextMenu";
import { useKanvasHint } from "./useKanvasHint";
import { useMouseWheelZooming } from "./useMouseWheelZooming";
import { usePanning } from "./usePanning";

const emit = defineEmits(["containerSizeChanged"]);

const canvasStore = useSVGCanvasStore();
const { contentBounds, canvasSize, viewBox, interactionsEnabled } =
  storeToRefs(canvasStore);

watch(contentBounds, (next, prev) => {
  canvasStore.contentBoundsChanged([next, prev]);
});
const { hasPanModeEnabled } = storeToRefs(useCanvasModesStore());

const { isWorkflowEmpty } = storeToRefs(useWorkflowStore());
const { isDraggingNodeTemplate } = storeToRefs(useNodeTemplatesStore());

const rootEl = ref<HTMLDivElement | null>(null);
let resizeObserver: ResizeObserver, stopResizeObserver: () => void;

const initResizeObserver = () => {
  // updating the container size and recalculating the canvas is debounced.
  const updateContainerSize = debounce(() => {
    canvasStore.updateContainerSize();
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
  canvasStore.initScrollContainerElement(rootEl.value!);
  initResizeObserver();
});

useKanvasHint();

onBeforeUnmount(() => {
  // Stop Resize Observer
  stopResizeObserver();
});

useCanvasMoveLocking();

const { onMouseWheel } = useMouseWheelZooming({
  rootEl: rootEl as Ref<HTMLElement>,
});

const { shouldShowMoveCursor, beginPan, movePan, stopPan, isHoldingDownSpace } =
  usePanning({
    rootEl: rootEl as Ref<HTMLElement>,
  });

const hasKeyboardFocus = useKeyPressedUntilMouseClick(["Tab"]);

const { doInitialSelection } = useArrowKeyNavigation({
  isHoldingDownSpace,
  rootEl: rootEl as Ref<HTMLElement>,
});
useKanvasContextMenu({ rootEl: rootEl as Ref<HTMLElement> });

const startRectangleSelection = (event: PointerEvent) => {
  const metaOrCtrlKey = getMetaOrCtrlKey();

  if (event.shiftKey || event[metaOrCtrlKey]) {
    $bus.emit("selection-pointerdown", event);
  }
};

const selectionStore = useSelectionStore();

const onLeftControlClickOnMac = async (event: PointerEvent) => {
  const { wasAborted } = await selectionStore.deselectAllObjects();
  if (!wasAborted) {
    await useCanvasAnchoredComponentsStore().toggleContextMenu({ event });
  }
};

const wasLastPointerDownOnSvg: Ref<boolean> = ref(false);
const clickOnEmptyKanvas = async (event: MouseEvent) => {
  const clickedSolelyOnSvg =
    event.target === event.currentTarget && wasLastPointerDownOnSvg.value;
  const specialKey = event.ctrlKey || event.shiftKey || event.metaKey;

  if (clickedSolelyOnSvg && !specialKey) {
    wasLastPointerDownOnSvg.value = false;
    await selectionStore.deselectAllObjects();
  }
};

const isTriggeredByAttachedElement = (event: Event) =>
  event.target === event.currentTarget;

const movingStore = useMovingStore();
const onEscapeKey = (event: KeyboardEvent) => {
  // abort any drag of objects (nodes, annotations) in the svg canvas
  if (movingStore.isDragging) {
    movingStore.abortDrag();
    return;
  }

  // de-select objects
  if (isTriggeredByAttachedElement(event) && !event.defaultPrevented) {
    selectionStore.deselectAllObjects();
  }
};
</script>

<template>
  <div
    :id="KANVAS_ID"
    ref="rootEl"
    tabindex="0"
    :class="[
      'scroll-container',
      {
        panning: shouldShowMoveCursor || hasPanModeEnabled,
        empty: isWorkflowEmpty,
        disabled: !interactionsEnabled,
        'indicate-node-drag': isWorkflowEmpty && isDraggingNodeTemplate,
      },
    ]"
    @wheel="onMouseWheel"
    @pointerdown.middle="beginPan"
    @pointerdown.left.exact="beginPan"
    @pointerdown.left.ctrl="
      navigatorUtils.isMac() && onLeftControlClickOnMac($event)
    "
    @pointerup.middle="stopPan"
    @pointerup.left="stopPan"
    @pointerup.prevent.right="stopPan"
    @pointermove="movePan"
    @focusin="() => hasKeyboardFocus && doInitialSelection()"
    @keydown.esc="onEscapeKey"
  >
    <svg
      ref="svg"
      :width="canvasSize.width"
      :height="canvasSize.height"
      :viewBox="viewBox.string"
      @click="clickOnEmptyKanvas"
      @pointerdown.left.exact="
        (event) => {
          wasLastPointerDownOnSvg = event.target === event.currentTarget;
          $bus.emit('selection-pointerdown', event);
        }
      "
      @pointerdown.left="startRectangleSelection"
      @pointerup.left.stop="$bus.emit('selection-pointerup', $event)"
      @pointerdown.right="
        isTriggeredByAttachedElement($event) && beginPan($event)
      "
      @pointermove="$bus.emit('selection-pointermove', $event)"
      @lostpointercapture="$bus.emit('selection-lostpointercapture', $event)"
    >
      <slot />
    </svg>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.scroll-container > svg {
  position: relative;
  color: var(--knime-masala);
  background-color: white;

  /* needed for z-index to have effect */
  display: block;
}

.indicate-node-drag > svg {
  background-color: var(--knime-gray-ultra-light);
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
