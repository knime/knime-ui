<!-- eslint-disable no-use-before-define -->
<!-- eslint-disable func-style -->
<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import rafThrottle from "raf-throttle";

import type { XY } from "@/api/gateway-api/generated-api";
import { useGlobalBusListener } from "@/composables/useGlobalBusListener";
import { DashLine } from "@/lib/pixi-dash-line";
import { SpatialHash } from "@/lib/workflow-canvas";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useSelectionStore } from "@/store/selection";
import { useMovingStore } from "@/store/workflow/moving";
import { useWorkflowStore } from "@/store/workflow/workflow";
import * as $colors from "@/style/colors";
import type { GraphicsInst } from "@/vue3-pixi";
import { pixiGlobals } from "../common/pixiGlobals";
import {
  type PanningToEdgeUpdateHandler,
  useDragNearEdgePanning,
} from "../kanvas/useDragNearEdgePanning";

const canvasStore = useWebGLCanvasStore();
const { zoomFactor, canvasOffset } = storeToRefs(canvasStore);
const movingStore = useMovingStore();
const { isDragging } = storeToRefs(movingStore);
const { workflowObjects } = storeToRefs(useWorkflowStore());
const selectionStore = useSelectionStore();

const inverseMode = ref(false);
const isSelectionRectangleVisible = ref(false);

const spatialHash = new SpatialHash();

const startPos = ref<XY>({ x: 0, y: 0 });
const endPos = ref<XY>({ x: 0, y: 0 });

const selectionOnStart = new Map<
  string,
  { id: string; type: "node" | "annotation" }
>();

const { startPanningToEdge, stopPanningToEdge } = useDragNearEdgePanning();

let selectionPointerId: number | undefined;
let didDrag = false;

const updateSelectionPreview = () => {
  const { inside } = spatialHash.queryRectBounds(selectionRectangle.value);

  const next: {
    nodes: string[];
    annotations: string[];
  } = { nodes: [], annotations: [] };

  if (inverseMode.value) {
    // add objects inside rectangle that were NOT selected initially
    for (const [id, { type }] of inside) {
      if (!selectionOnStart.has(id)) {
        const target = type === "node" ? next.nodes : next.annotations;
        target.push(id);
      }
    }

    // remove objects inside rectangle that were selected initially
    for (const [id, { type }] of selectionOnStart) {
      if (!inside.has(id)) {
        const target = type === "node" ? next.nodes : next.annotations;
        target.push(id);
      }
    }
  } else {
    for (const [id, { type }] of inside) {
      const target = type === "node" ? next.nodes : next.annotations;
      target.push(id);
    }
  }

  selectionStore.deselectAllObjects([], "preview");
  selectionStore.selectNodes(next.nodes, "preview");
  selectionStore.selectAnnotations(next.annotations, "preview");
};

const clearState = () => {
  selectionOnStart.clear();
  didDrag = false;
};

const selectionRectangle = computed(() => ({
  x: Math.min(startPos.value.x, endPos.value.x),
  y: Math.min(startPos.value.y, endPos.value.y),
  width: Math.abs(endPos.value.x - startPos.value.x),
  height: Math.abs(endPos.value.y - startPos.value.y),
}));

const onSelectionStart = (event: PointerEvent) => {
  consola.debug("global rectangle selection:: start", { event });

  // Interactions originated from canvas objects can signal that the
  // global selection should be skipped.
  if (
    event.dataset?.skipGlobalSelection ||
    isDragging.value ||
    canvasStore.interactionsEnabled === "none"
  ) {
    isSelectionRectangleVisible.value = false;
    return;
  }

  if (!selectionStore.canClearCurrentSelection()) {
    selectionStore.promptUserAboutClearingSelection().then(({ wasAborted }) => {
      if (wasAborted) {
        return;
      }

      selectionStore.deselectAllObjects();
    });
    // end interaction regardless of user discarding or not
    // to prevent the selection rectangle from getting stuck in an odd state
    return;
  }

  selectionPointerId = event.pointerId;
  (event.target as HTMLElement).setPointerCapture(event.pointerId);
  isSelectionRectangleVisible.value = true;

  const { offsetX, offsetY } = event;

  startPos.value = {
    x: (offsetX - canvasOffset.value.x) / zoomFactor.value,
    y: (offsetY - canvasOffset.value.y) / zoomFactor.value,
  };
  endPos.value = {
    x: startPos.value.x,
    y: startPos.value.y,
  };

  spatialHash.reset(workflowObjects.value);

  inverseMode.value = event.shiftKey || event.ctrlKey || event.metaKey;

  if (inverseMode.value) {
    for (const id of selectionStore.selectedNodeIds) {
      selectionOnStart.set(id, { id, type: "node" });
    }

    for (const id of selectionStore.selectedAnnotationIds) {
      selectionOnStart.set(id, { id, type: "annotation" });
    }
  } else {
    selectionStore.deselectAllObjects();
  }

  const canvas = pixiGlobals.getCanvas();

  const onSelectionMove = rafThrottle((event: PointerEvent) => {
    if (
      !isSelectionRectangleVisible.value ||
      isDragging.value ||
      event.pointerId !== selectionPointerId
    ) {
      return;
    }

    didDrag = true;
    if (canvasStore.interactionsEnabled === "all") {
      canvasStore.setInteractionsEnabled("none");
    }

    startPanningToEdge(event, onPanningToEdgeUpdate);

    const { offsetX, offsetY } = event;

    endPos.value = {
      x: (offsetX - canvasOffset.value.x) / zoomFactor.value,
      y: (offsetY - canvasOffset.value.y) / zoomFactor.value,
    };

    updateSelectionPreview();
  });

  const onSelectionEnd = rafThrottle((event: PointerEvent) => {
    if (selectionPointerId === undefined) {
      return;
    }

    canvas.removeEventListener("pointermove", onSelectionMove);
    canvas.removeEventListener("pointerup", onSelectionEnd);

    consola.debug("global rectangle selection:: end", { event });
    startPos.value = { x: 0, y: 0 };
    endPos.value = { x: 0, y: 0 };

    stopPanningToEdge();
    canvasStore.setInteractionsEnabled("all");

    if (
      event.dataset?.skipGlobalSelection ||
      isDragging.value ||
      !isSelectionRectangleVisible.value ||
      event.pointerId !== selectionPointerId
    ) {
      isSelectionRectangleVisible.value = false;
      clearState();
      return;
    }

    isSelectionRectangleVisible.value = false;
    const target = event.target as HTMLElement;
    if (target.hasPointerCapture(selectionPointerId!)) {
      target.releasePointerCapture(selectionPointerId!);
    }
    selectionPointerId = undefined;

    // when a drag didn't happen then no rectangle was made
    // so we don't need to commit a preview
    if (didDrag) {
      selectionStore.commitSelectionPreview();
    }

    clearState();
  });

  canvas.addEventListener("pointermove", onSelectionMove);
  canvas.addEventListener("pointerup", onSelectionEnd);
  updateSelectionPreview();
};

const onPanningToEdgeUpdate: PanningToEdgeUpdateHandler = ({
  offset,
  isAtEdge,
}) => {
  if (!isAtEdge.x) {
    endPos.value.x -= offset.x;
  }
  if (!isAtEdge.y) {
    endPos.value.y -= offset.y;
  }
  updateSelectionPreview();
};

const DASH_ARRAY = 5;

// make sure dash stays consistent across zoom levels
const dashStrokeArray = computed(() => [
  DASH_ARRAY / zoomFactor.value,
  DASH_ARRAY / zoomFactor.value,
]);

const renderFn = (graphics: GraphicsInst) => {
  graphics.clear();
  const dash = new DashLine(graphics, {
    dash: dashStrokeArray.value,
    width: 1,
  });
  dash.rect(
    0,
    0,
    selectionRectangle.value.width ?? 0,
    selectionRectangle.value.height ?? 0,
  );
  graphics.stroke({
    color: $colors.kanvasNodeSelection.activeBorder,
    pixelLine: true,
  });
};

useGlobalBusListener({
  eventName: "selection-pointerdown",
  handler: onSelectionStart,
});
</script>

<template>
  <Graphics
    v-if="isSelectionRectangleVisible"
    label="SelectionRectangle"
    :x="selectionRectangle.x"
    :y="selectionRectangle.y"
    @render="renderFn"
  />
</template>
