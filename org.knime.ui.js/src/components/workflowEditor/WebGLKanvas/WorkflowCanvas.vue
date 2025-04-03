<script setup lang="ts">
import {
  type Ref,
  computed,
  onMounted,
  onUnmounted,
  useTemplateRef,
} from "vue";
import { debounce } from "lodash-es";
import { storeToRefs } from "pinia";

import { useDropNode } from "@/composables/useDropNode";
import { useCanvasStateTrackingStore } from "@/store/application/canvasStateTracking";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { KANVAS_ID } from "@/util/getKanvasDomElement";
import WorkflowEmpty from "../SVGKanvas/WorkflowEmpty.vue";
import { useArrowKeyNavigation } from "../useArrowKeyNavigation";

import Workflow from "./Workflow.vue";
import EditableWorkflowAnnotation from "./annotations/EditableWorkflowAnnotation.vue";
import { usePointerDownDoubleClick } from "./common/usePointerDownDoubleClick";
import Kanvas from "./kanvas/Kanvas.vue";

const { onDrop, onDragOver } = useDropNode();
const { activeWorkflow, isWorkflowEmpty } = storeToRefs(useWorkflowStore());

const openQuickActionMenu = (event: PointerEvent) => {
  const [x, y] = useWebGLCanvasStore().screenToCanvasCoordinates([
    event.clientX,
    event.clientY,
  ]);

  useCanvasAnchoredComponentsStore().openQuickActionMenu({
    props: { position: { x, y } },
  });
};

const { isPointerDownDoubleClick } = usePointerDownDoubleClick({
  checkForPreventDefault: true,
});

const onPointerDown = (event: PointerEvent) => {
  if (isPointerDownDoubleClick(event)) {
    openQuickActionMenu(event);
  }
};

let resizeObserver: ResizeObserver, stopResizeObserver: () => void;
const canvasStore = useWebGLCanvasStore();
const { containerSize } = storeToRefs(canvasStore);

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
  if (!rootEl.value) {
    return;
  }

  // updating the container size and recalculating the canvas is debounced.
  const updateContainerSize = debounce(() => {
    canvasStore.updateContainerSize();
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
</script>

<template>
  <div
    :id="KANVAS_ID"
    ref="rootEl"
    tabindex="0"
    class="kanvas-container"
    @drop.stop="onDrop"
    @dragover.prevent.stop="onDragOver"
    @pointerdown="onPointerDown"
  >
    <Kanvas
      v-if="activeWorkflow && !isWorkflowEmpty"
      @canvas-ready="onCanvasReady?.()"
    >
      <Workflow />
    </Kanvas>

    <EditableWorkflowAnnotation />

    <svg
      v-if="activeWorkflow && isWorkflowEmpty"
      :width="containerSize.width"
      :height="containerSize.height"
      :viewBox="workflowEmptyViewBox"
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
