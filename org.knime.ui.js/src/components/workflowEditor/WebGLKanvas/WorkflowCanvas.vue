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

import { sleep } from "@knime/utils";

import { useAnalyticsService } from "@/analytics";
import { useDragNodeIntoCanvas } from "@/components/nodeTemplates";
import { isBrowser } from "@/environment";
import { KANVAS_ID } from "@/lib/workflow-canvas";
import { useAiQuickActionsStore } from "@/store/ai/aiQuickActions";
import { QuickActionId } from "@/store/ai/types";
import { useCanvasStateTrackingStore } from "@/store/application/canvasStateTracking";
import { useLifecycleStore } from "@/store/application/lifecycle";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import { useSelectionStore } from "@/store/selection";
import { useWorkflowStore } from "@/store/workflow/workflow";
import WorkflowEmpty from "../SVGKanvas/WorkflowEmpty.vue";
import { useArrowKeyNavigation } from "../useArrowKeyNavigation";

import Workflow from "./Workflow.vue";
import EditableWorkflowAnnotation from "./annotations/EditableWorkflowAnnotation.vue";
import SkeletonAnnotation from "./annotations/SkeletonAnnotation.vue";
import { usePointerDownDoubleClick } from "./common/usePointerDownDoubleClick";
import FloatingWorkflowActions from "./floatingToolbar/FloatingWorkflowActions.vue";
import FloatingCanvasTools from "./floatingToolbar/canvasTools/FloatingCanvasTools.vue";
import Kanvas from "./kanvas/Kanvas.vue";
import NodeLabelEditor from "./node/nodeLabel/NodeLabelEditor.vue";
import NodeNameEditor from "./node/nodeName/NodeNameEditor.vue";
import Tooltip from "./tooltip/Tooltip.vue";
import { isMarkedEvent } from "./util/interaction";

const { onDrop, onDragOver } = useDragNodeIntoCanvas();
const { isLoadingWorkflow } = storeToRefs(useLifecycleStore());
const { activeWorkflow, isWorkflowEmpty, isWritable } = storeToRefs(
  useWorkflowStore(),
);
const aiQuickActionsStore = useAiQuickActionsStore();
const canvasStore = useWebGLCanvasStore();

const { containerSize, shouldHideMiniMap, interactionsEnabled } =
  storeToRefs(canvasStore);

const skeletonAnnotationData = computed(
  () =>
    aiQuickActionsStore.processingActions[QuickActionId.GenerateAnnotation] ??
    null,
);

const { isPointerDownDoubleClick } = usePointerDownDoubleClick({
  eventHandledChecker: (event) => isMarkedEvent(event),
});

const onPointerDown = (event: PointerEvent) => {
  if (isMarkedEvent(event)) {
    return;
  }

  if (!isWritable.value) {
    return;
  }

  if (isPointerDownDoubleClick(event) && interactionsEnabled.value === "all") {
    // Prevent the kanvas from stealing focus from quick action menu
    event.preventDefault();

    const [x, y] = canvasStore.screenToCanvasCoordinates([
      event.clientX,
      event.clientY,
    ]);

    useCanvasAnchoredComponentsStore().openQuickActionMenu({
      props: { position: { x, y } },
    });

    useAnalyticsService().track("qam_opened::canvas_doubleclick_");
  }
};

let resizeObserver: ResizeObserver,
  stopResizeObserver: () => void,
  onCanvasReady: () => void;

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

const onEscape = async (event: KeyboardEvent) => {
  // wait for dragging to be maybe canceled and skip de-selection if so
  await sleep(0);

  consola.debug(
    "webgl/WorlfkowCanvas onEscape deselect of all objects",
    event.dataset,
  );

  if (!event.dataset?.skipDeselectByKeyboard) {
    event.stopPropagation();
    useSelectionStore().deselectAllObjects();
  }
};

const onKeyDown = (event: KeyboardEvent) => {
  // Handle opening the context menu *just* for the keys here. Using right click
  // to open it is already covered by the panning logic
  if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
    event.preventDefault();
    useCanvasAnchoredComponentsStore().toggleContextMenu();
  }

  if (event.key === "Escape") {
    onEscape(event);
  }
};

const onWorkflowEmptyContextMenu = (event: MouseEvent) => {
  useCanvasAnchoredComponentsStore().toggleContextMenu({ event });
};
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
    @keydown="onKeyDown"
  >
    <Kanvas
      v-if="activeWorkflow && !isWorkflowEmpty && !isLoadingWorkflow"
      @canvas-ready="onCanvasReady?.()"
    >
      <Workflow />
    </Kanvas>

    <EditableWorkflowAnnotation />

    <SkeletonAnnotation
      v-if="skeletonAnnotationData"
      :bounds="skeletonAnnotationData.bounds"
    />

    <NodeNameEditor />

    <NodeLabelEditor />

    <FloatingWorkflowActions v-if="!isLoadingWorkflow && isBrowser()" />

    <FloatingCanvasTools v-if="!isWorkflowEmpty" />

    <Tooltip />

    <svg
      v-if="activeWorkflow && isWorkflowEmpty"
      :width="containerSize.width"
      :height="containerSize.height"
      :viewBox="workflowEmptyViewBox"
      aria-label="Empty workflow – start by adding nodes"
      data-test-id="empty-workflow"
      @contextmenu="onWorkflowEmptyContextMenu"
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
  isolation: isolate;

  & :deep(canvas) {
    position: relative;
    z-index: v-bind("$zIndices.layerCanvasSurface");

    /* override z-index added by Pixi's DOMContainer implementation */
    & ~ div:not([class]) {
      isolation: isolate;
      transform: none !important;
      z-index: v-bind("$zIndices.layerCanvasDomContainers") !important;
    }
  }

  &:focus {
    outline: none;
  }
}
</style>
