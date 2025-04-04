<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";

import type { XY } from "@/api/gateway-api/generated-api";
import { useGlobalBusListener } from "@/composables/useGlobalBusListener";
import { $bus } from "@/plugins/event-bus";
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

const isSelectionVisible = ref(false);
const startPos = ref<XY>({ x: 0, y: 0 });
const endPos = ref<XY>({ x: 0, y: 0 });

const nodesInside = ref<string[]>([]);
const nodesOutside = ref<string[]>([]);
const annotationsInside = ref<string[]>([]);
const annotationsOutside = ref<string[]>([]);

const updateSelectionPreview = () => {
  const {
    nodesInside: _nodesInside,
    nodesOutside: _nodesOutside,
    annotationsInside: _annotationsInside,
    annotationsOutside: _annotationsOutside,
  } = findObjectsForSelection({
    startPos: startPos.value,
    endPos: endPos.value,
    workflow: activeWorkflow.value!,
  });

  nodesInside.value = _nodesInside;
  nodesOutside.value = _nodesOutside;
  annotationsInside.value = _annotationsInside;
  annotationsOutside.value = _annotationsOutside;

  nodesInside.value.forEach((id) => {
    $bus.emit(`node-selection-preview-${id}`, {
      id,
      preview: "show",
    });
  });

  nodesOutside.value.forEach((id) => {
    $bus.emit(`node-selection-preview-${id}`, {
      id,
      preview: "hide",
    });
  });

  annotationsInside.value.forEach((id) => {
    $bus.emit(`annotation-selection-preview-${id}`, {
      id,
      preview: "show",
    });
  });

  annotationsOutside.value.forEach((id) => {
    $bus.emit(`annotation-selection-preview-${id}`, {
      id,
      preview: "hide",
    });
  });
};

const doRealSelection = () => {
  if (nodesInside.value.length) {
    selectionStore.selectNodes(nodesInside.value);

    nodesInside.value.forEach((id) => {
      $bus.emit(`node-selection-preview-${id}`, {
        id,
        preview: null,
      });
    });

    nodesInside.value = [];
  }

  if (nodesOutside.value.length) {
    selectionStore.deselectNodes(nodesOutside.value);

    nodesOutside.value.forEach((id) => {
      $bus.emit(`node-selection-preview-${id}`, {
        id,
        preview: null,
      });
    });

    nodesOutside.value = [];
  }

  if (annotationsInside.value.length) {
    selectionStore.selectAnnotations(annotationsInside.value);

    annotationsInside.value.forEach((id) => {
      $bus.emit(`annotation-selection-preview-${id}`, {
        id,
        preview: null,
      });
    });

    annotationsInside.value = [];
  }

  if (annotationsOutside.value.length) {
    selectionStore.deselectAnnotations(annotationsOutside.value);

    annotationsOutside.value.forEach((id) => {
      $bus.emit(`annotation-selection-preview-${id}`, {
        id,
        preview: null,
      });
    });

    annotationsOutside.value = [];
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

let selectionPointerId: number | undefined;

const onSelectionStart = (event: PointerEvent) => {
  consola.debug("global rectangle selection:: start", { event });
  // Interactions originated from canvas objects can signal that the
  // global selection should be skipped.
  if (event.dataset?.skipGlobalSelection || isDragging.value) {
    return;
  }

  selectionPointerId = event.pointerId;
  (event.target as HTMLElement).setPointerCapture(event.pointerId);
  selectionStore.deselectAllObjects();
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
};

const onSelectionMove = (event: PointerEvent) => {
  if (!isSelectionVisible.value || isDragging.value) {
    return;
  }

  const { offsetX, offsetY } = event;

  endPos.value = {
    x: (offsetX - canvasOffset.value.x) / zoomFactor.value,
    y: (offsetY - canvasOffset.value.y) / zoomFactor.value,
  };

  updateSelectionPreview();
};

const onSelectionEnd = (event: PointerEvent) => {
  consola.debug("global rectangle selection:: end", { event });
  isSelectionVisible.value = false;
  startPos.value = { x: 0, y: 0 };
  endPos.value = { x: 0, y: 0 };

  doRealSelection();

  const target = event.target as HTMLElement;
  if (target.hasPointerCapture(selectionPointerId!)) {
    target.releasePointerCapture(selectionPointerId!);
  }
  selectionPointerId = undefined;
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
