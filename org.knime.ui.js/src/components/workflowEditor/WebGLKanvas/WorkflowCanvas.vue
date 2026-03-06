<script setup lang="ts">
import {
  type Ref,
  computed,
  onMounted,
  onUnmounted,
  useTemplateRef,
} from "vue";
import { debounce } from "es-toolkit/function";
import { storeToRefs } from "pinia";

import { sleep } from "@knime/utils";

import type { XY } from "@/api/gateway-api/generated-api";
import { useDragNodeIntoCanvas } from "@/components/nodeTemplates";
import { useAddNodeViaFileUpload } from "@/components/nodeTemplates/useAddNodeViaFileUpload";
import { isBrowser } from "@/environment";
import { KANVAS_ID } from "@/lib/workflow-canvas";
import { useAnalytics } from "@/services/analytics";
import { useCanvasStateTrackingStore } from "@/store/application/canvasStateTracking";
import { useLifecycleStore } from "@/store/application/lifecycle";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import { useSelectionStore } from "@/store/selection";
import { useWorkflowStore } from "@/store/workflow/workflow";
import * as $shapes from "@/style/shapes";
import WorkflowEmpty from "../SVGKanvas/WorkflowEmpty.vue";
import { useArrowKeyNavigation } from "../useArrowKeyNavigation";

import Workflow from "./Workflow.vue";
import EditableWorkflowAnnotation from "./annotations/EditableWorkflowAnnotation.vue";
import { usePointerDownDoubleClick } from "./common/usePointerDownDoubleClick";
import FloatingCanvasTools from "./floatingToolbar/canvasTools/FloatingCanvasTools.vue";
import Kanvas from "./kanvas/Kanvas.vue";
import WorkflowDescriptionCanvasElement from "./nodeDescription/WorkflowDescriptionCanvasElement.vue";
import NodeLabelEditor from "./node/nodeLabel/NodeLabelEditor.vue";
import NodeNameEditor from "./node/nodeName/NodeNameEditor.vue";
import Tooltip from "./tooltip/Tooltip.vue";
import { isMarkedEvent } from "./util/interaction";

const { isLoadingWorkflow } = storeToRefs(useLifecycleStore());
const { activeWorkflow, isWorkflowEmpty, isWritable } = storeToRefs(
  useWorkflowStore(),
);
const canvasStore = useWebGLCanvasStore();

const { containerSize, shouldHideMiniMap, interactionsEnabled } =
  storeToRefs(canvasStore);

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

    useAnalytics().track({ id: "qam_opened::canvas_doubleclick_" });
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

const dropNodeIntoCanvas = useDragNodeIntoCanvas.dropTarget();
const addNodeViaUpload = useAddNodeViaFileUpload();

const onCanvasDragover = (event: DragEvent) => {
  dropNodeIntoCanvas.onDragOver(event);
};

const onCanvasDrop = (event: DragEvent) => {
  if (!isWritable.value) {
    return;
  }

  const [canvasX, canvasY] = canvasStore.screenToCanvasCoordinates([
    event.clientX,
    event.clientY,
  ]);

  const dropPosition: XY = {
    x: canvasX - $shapes.nodeSize / 2,
    y: canvasY - $shapes.nodeSize / 2,
  };

  // handle native OS file drops for browser envs
  if (isBrowser()) {
    const dt = event.dataTransfer;
    const droppedFiles = Array.from(dt?.files ?? []);

    if (droppedFiles.length > 0) {
      addNodeViaUpload.importFilesViaDrop(droppedFiles, dropPosition);
      event.preventDefault();
      return;
    }
  }

  dropNodeIntoCanvas.onDrop(event, dropPosition);
};
</script>

<template>
  <div
    :id="KANVAS_ID"
    ref="rootEl"
    :tabindex="TAB_INDEX"
    class="kanvas-container"
    @drop.stop="onCanvasDrop"
    @dragover.prevent.stop="onCanvasDragover"
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

    <NodeNameEditor />

    <NodeLabelEditor />

    <FloatingCanvasTools />

    <WorkflowDescriptionCanvasElement />

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
  width: 100%;
  height: 100%;
  overflow: hidden;
  isolation: isolate;

  & :deep(canvas) {
    position: relative;
    z-index: v-bind("$zIndices.layerCanvasSurface");

    /* override z-index added by Pixi's DOMContainer implementation */
    & ~ div:not([class]) {
      z-index: v-bind("$zIndices.layerCanvasDomContainers") !important;
      isolation: isolate;
      transform: none !important;
    }
  }

  &:focus {
    outline: none;
  }
}
</style>
