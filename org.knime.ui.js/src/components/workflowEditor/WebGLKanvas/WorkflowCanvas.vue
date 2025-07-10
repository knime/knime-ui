<script setup lang="ts">
import {
  type Ref,
  computed,
  onMounted,
  onUnmounted,
  useTemplateRef,
} from "vue";
import { flushPromises } from "@vue/test-utils";
import { debounce } from "lodash-es";
import { storeToRefs } from "pinia";

import { useDragNodeIntoCanvas } from "@/composables/useDragNodeIntoCanvas";
import { useCanvasStateTrackingStore } from "@/store/application/canvasStateTracking";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import { useSelectionStore } from "@/store/selection";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { KANVAS_ID } from "@/util/getKanvasDomElement";
import WorkflowEmpty from "../SVGKanvas/WorkflowEmpty.vue";
import { useArrowKeyNavigation } from "../useArrowKeyNavigation";

import Workflow from "./Workflow.vue";
import EditableWorkflowAnnotation from "./annotations/EditableWorkflowAnnotation.vue";
import FloatingCanvasTools from "./canvasTools/FloatingCanvasTools.vue";
import { usePointerDownDoubleClick } from "./common/usePointerDownDoubleClick";
import Kanvas from "./kanvas/Kanvas.vue";
import NodeLabelEditor from "./node/nodeLabel/NodeLabelEditor.vue";
import NodeNameEditor from "./node/nodeName/NodeNameEditor.vue";

const { onDrop, onDragOver } = useDragNodeIntoCanvas();
const { activeWorkflow, isWorkflowEmpty } = storeToRefs(useWorkflowStore());

const openQuickActionMenu = (event: PointerEvent) => {
  if (event.dataset) {
    return;
  }

  const [x, y] = useWebGLCanvasStore().screenToCanvasCoordinates([
    event.clientX,
    event.clientY,
  ]);

  useCanvasAnchoredComponentsStore().openQuickActionMenu({
    props: { position: { x, y } },
  });
};

const { isPointerDownDoubleClick } = usePointerDownDoubleClick({
  eventHandledChecker: (event) => {
    return Boolean(event.dataset);
  },
});

const onPointerDown = (event: PointerEvent) => {
  if (isPointerDownDoubleClick(event)) {
    // Prevent the kanvas from stealing focus from quick action menu
    event.preventDefault();
    openQuickActionMenu(event);
  }
};

let resizeObserver: ResizeObserver, stopResizeObserver: () => void;
const canvasStore = useWebGLCanvasStore();
const { containerSize, shouldHideMiniMap } = storeToRefs(canvasStore);

let onCanvasReady: () => void;

const workflowEmptyViewBox = computed(() =>
  [
    -containerSize.value.width / 2,
    -containerSize.value.height / 2,
    containerSize.value.width,
    containerSize.value.height,
  ].join(" "),
);

onMounted(() => {
  if (isWorkflowEmpty.value) {
    return;
  }

  onCanvasReady = async () => {
    const wasRestored =
      await useCanvasStateTrackingStore().restoreCanvasState();

    if (!wasRestored) {
      // just fill screen if we did not find a saved state
      canvasStore.fillScreen();
    }
  };
});

const rootEl = useTemplateRef("rootEl");
const initResizeObserver = () => {
  let minimapVisibilityTimeout: number;
  if (!rootEl.value) {
    return;
  }

  // updating the container size and recalculating the canvas is debounced.
  const updateContainerSize = debounce(() => {
    canvasStore.updateContainerSize();
  }, 100);

  resizeObserver = new ResizeObserver((entries) => {
    const containerEl = entries.find(({ target }) => target === rootEl.value);
    if (!containerEl) {
      return;
    }

    shouldHideMiniMap.value = true;

    if (minimapVisibilityTimeout) {
      clearTimeout(minimapVisibilityTimeout);
    }

    minimapVisibilityTimeout = window.setTimeout(() => {
      shouldHideMiniMap.value = false;
      // eslint-disable-next-line no-magic-numbers
    }, 300);

    updateContainerSize();
  });

  stopResizeObserver = () => {
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
  };

  resizeObserver.observe(rootEl.value);
};

useArrowKeyNavigation({
  isHoldingDownSpace: computed(() => false),
  rootEl: rootEl as Ref<HTMLElement>,
});

onMounted(() => {
  canvasStore.initScrollContainerElement(rootEl.value!);
  rootEl.value!.focus();
  initResizeObserver();
});

onUnmounted(() => {
  stopResizeObserver?.();
});

// Canvas div needs to be focusable to receive keyboard events for navigation, moving objects, Escape handling, etc.
const TAB_INDEX = 0;
</script>

<template>
  <div
    :id="KANVAS_ID"
    ref="rootEl"
    :tabindex="TAB_INDEX"
    class="kanvas-container"
    @drop.stop="onDrop"
    @dragover.prevent.stop="onDragOver"
    @pointerdown="onPointerDown"
    @keydown.esc="
      async (event) => {
        // wait for dragging to be maybe canceled and skip de-delection if so
        await flushPromises();
        if (!event.defaultPrevented) {
          await useSelectionStore().deselectAllObjects();
        }
      }
    "
  >
    <Kanvas
      v-if="activeWorkflow && !isWorkflowEmpty"
      @canvas-ready="onCanvasReady?.()"
    >
      <Workflow />
    </Kanvas>

    <EditableWorkflowAnnotation />

    <NodeNameEditor />

    <NodeLabelEditor />

    <FloatingCanvasTools v-if="!isWorkflowEmpty" />

    <svg
      v-if="activeWorkflow && isWorkflowEmpty"
      :width="containerSize.width"
      :height="containerSize.height"
      :viewBox="workflowEmptyViewBox"
      aria-label="Empty workflow – start by adding nodes"
    >
      <WorkflowEmpty />
    </svg>
  </div>
</template>

<style lang="postcss" scoped>
.kanvas-container {
  position: relative;
  overflow: hidden;
  height: 100%;
  width: 100%;

  &:focus {
    outline: none;
  }
}
</style>
