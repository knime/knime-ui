<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";

import type { XY } from "@/api/gateway-api/generated-api";
import { useGlobalBusListener } from "@/composables/useGlobalBusListener";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useSelectionStore } from "@/store/selection";
import { useMovingStore } from "@/store/workflow/moving";
import { useWorkflowStore } from "@/store/workflow/workflow";
import * as $colors from "@/style/colors";
import { DashLine } from "@/util/pixiDashedLine";
import type { GraphicsInst } from "@/vue3-pixi";
import { findObjectsForSelection } from "../../util/findObjectsForSelection";

const canvasStore = useWebGLCanvasStore();
const { zoomFactor, canvasOffset } = storeToRefs(canvasStore);
const { isDragging } = storeToRefs(useMovingStore());
const { activeWorkflow } = storeToRefs(useWorkflowStore());
const selectionStore = useSelectionStore();

const inverseMode = ref(false);
const isSelectionVisible = ref(false);

const startPos = ref<XY>({ x: 0, y: 0 });
const endPos = ref<XY>({ x: 0, y: 0 });

const selectedNodeIdsAtStart = ref<string[]>([]);
const nodeIdsToSelectOnEnd = ref<string[]>([]);
const nodeIdsToDeselectOnEnd = ref<string[]>([]);

const selectedAnnotationIdsAtStart = ref<string[]>([]);
const annotationIdsToSelectOnEnd = ref<string[]>([]);
const annotationIdsToDeselectOnEnd = ref<string[]>([]);

let selectionPointerId: number | undefined;

const calculateNodeSelection = () => {
  const selection = [
    ...selectedNodeIdsAtStart.value,
    ...nodeIdsToSelectOnEnd.value,
  ];

  return inverseMode.value
    ? selection.filter(
        (nodeId) => !nodeIdsToDeselectOnEnd.value.includes(nodeId),
      )
    : selection;
};

const calculateAnnotationSelection = () => {
  const selection = [
    ...selectedAnnotationIdsAtStart.value,
    ...annotationIdsToSelectOnEnd.value,
  ];
  return inverseMode.value
    ? selection.filter(
        (annotationId) =>
          !annotationIdsToDeselectOnEnd.value.includes(annotationId),
      )
    : selection;
};

const updateSelectionPreview = () => {
  const { nodesInside, annotationsInside } = findObjectsForSelection({
    startPos: startPos.value,
    endPos: endPos.value,
    workflow: activeWorkflow.value!,
  });

  nodeIdsToSelectOnEnd.value = nodesInside.filter(
    (nodeId) => !selectedNodeIdsAtStart.value.includes(nodeId),
  );
  nodeIdsToDeselectOnEnd.value = nodesInside.filter((nodeId) =>
    selectedNodeIdsAtStart.value.includes(nodeId),
  );

  annotationIdsToSelectOnEnd.value = annotationsInside.filter(
    (annotationId) =>
      !selectedAnnotationIdsAtStart.value.includes(annotationId),
  );
  annotationIdsToDeselectOnEnd.value = annotationsInside.filter(
    (annotationId) => selectedAnnotationIdsAtStart.value.includes(annotationId),
  );

  selectionStore.setPreselectionMode(true);
  selectionStore.deselectAllPreselectedObjects();
  selectionStore.preselectNodes(calculateNodeSelection());
  selectionStore.preselectAnnotations(calculateAnnotationSelection());
};

const clearState = () => {
  nodeIdsToSelectOnEnd.value = [];
  nodeIdsToDeselectOnEnd.value = [];
  selectedNodeIdsAtStart.value = [];

  annotationIdsToSelectOnEnd.value = [];
  annotationIdsToDeselectOnEnd.value = [];
  selectedAnnotationIdsAtStart.value = [];
};

const doRealSelection = async () => {
  const { deselectAllObjects, selectAnnotations } = useSelectionStore();

  const { wasAborted } = await deselectAllObjects(calculateNodeSelection());
  if (!wasAborted) {
    selectAnnotations(calculateAnnotationSelection());
  }
};

const selectionRectangle = computed(() =>
  isSelectionVisible.value
    ? {
        x: Math.min(startPos.value.x, endPos.value.x),
        y: Math.min(startPos.value.y, endPos.value.y),
        width: Math.abs(endPos.value.x - startPos.value.x),
        height: Math.abs(endPos.value.y - startPos.value.y),
      }
    : {},
);

const onSelectionStart = (event: PointerEvent) => {
  consola.debug("global rectangle selection:: start", { event });

  // Interactions originated from canvas objects can signal that the
  // global selection should be skipped.
  if (event.dataset?.skipGlobalSelection || isDragging.value) {
    isSelectionVisible.value = false;
    return;
  }

  selectionPointerId = event.pointerId;
  (event.target as HTMLElement).setPointerCapture(event.pointerId);
  isSelectionVisible.value = true;

  const { offsetX, offsetY } = event;

  startPos.value = {
    x: (offsetX - canvasOffset.value.x) / zoomFactor.value,
    y: (offsetY - canvasOffset.value.y) / zoomFactor.value,
  };
  endPos.value = {
    x: startPos.value.x,
    y: startPos.value.y,
  };

  selectionStore.setPreselectionMode(true);

  inverseMode.value = event.shiftKey || event.ctrlKey || event.metaKey;
  if (inverseMode.value) {
    selectedNodeIdsAtStart.value = [...selectionStore.selectedNodeIds];
    selectedAnnotationIdsAtStart.value = [
      ...selectionStore.selectedAnnotationIds,
    ];
  } else {
    selectedNodeIdsAtStart.value = [];
    selectedAnnotationIdsAtStart.value = [];
  }

  updateSelectionPreview();
};

const onSelectionMove = (event: PointerEvent) => {
  if (
    !isSelectionVisible.value ||
    isDragging.value ||
    event.pointerId !== selectionPointerId
  ) {
    return;
  }

  const { offsetX, offsetY } = event;

  endPos.value = {
    x: (offsetX - canvasOffset.value.x) / zoomFactor.value,
    y: (offsetY - canvasOffset.value.y) / zoomFactor.value,
  };

  updateSelectionPreview();
};

const onSelectionEnd = async (event: PointerEvent) => {
  consola.debug("global rectangle selection:: end", { event });
  startPos.value = { x: 0, y: 0 };
  endPos.value = { x: 0, y: 0 };

  selectionStore.deselectAllPreselectedObjects();
  selectionStore.setPreselectionMode(false);

  if (
    event.dataset?.skipGlobalSelection ||
    isDragging.value ||
    !isSelectionVisible.value ||
    event.pointerId !== selectionPointerId
  ) {
    isSelectionVisible.value = false;
    clearState();
    return;
  }
  isSelectionVisible.value = false;

  const target = event.target as HTMLElement;
  if (target.hasPointerCapture(selectionPointerId!)) {
    target.releasePointerCapture(selectionPointerId!);
  }
  selectionPointerId = undefined;

  await doRealSelection();
  clearState();
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
useGlobalBusListener({
  eventName: "selection-pointermove",
  handler: onSelectionMove,
});
useGlobalBusListener({
  eventName: "selection-pointerup",
  handler: onSelectionEnd,
});
</script>

<template>
  <Graphics
    v-if="isSelectionVisible"
    :x="selectionRectangle.x"
    :y="selectionRectangle.y"
    @render="renderFn"
  />
</template>
