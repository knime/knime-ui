<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import type { GraphicsInst } from "vue3-pixi";

import type { XY } from "@/api/gateway-api/generated-api";
import { $bus } from "@/plugins/event-bus";
import { useApplicationStore } from "@/store/application/application";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useSelectionStore } from "@/store/selection";
import { useMovingStore } from "@/store/workflow/moving";
import { useWorkflowStore } from "@/store/workflow/workflow";
import * as $colors from "@/style/colors";
import { findObjectsForSelection } from "../../util/findObjectsForSelection";

const canvasStore = useWebGLCanvasStore();
const { zoomFactor, canvasAnchor, canvasOffset } = storeToRefs(canvasStore);
const { isDragging } = storeToRefs(useMovingStore());
const { activeWorkflow } = storeToRefs(useWorkflowStore());
const selectionStore = useSelectionStore();

const isSelectionVisible = ref(false);
const startPos = ref<XY>({ x: 0, y: 0 });
const endPos = ref<XY>({ x: 0, y: 0 });

const nodesInside = ref<string[]>([]);
const nodesOutside = ref<string[]>([]);

const findNodesInsideSelection = () => {
  const { nodesInside: _nodesInside, nodesOutside: _nodesOutside } =
    findObjectsForSelection({
      startPos: startPos.value,
      endPos: endPos.value,
      workflow: activeWorkflow.value!,
    });

  nodesInside.value = _nodesInside;
  nodesOutside.value = _nodesOutside;

  nodesInside.value.forEach((node) => {
    $bus.emit(`node-selection-preview-${node}`, { id: node, preview: "show" });
  });

  nodesOutside.value.forEach((node) => {
    $bus.emit(`node-selection-preview-${node}`, { id: node, preview: "hide" });
  });
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
  if (isDragging.value || event.defaultPrevented) {
    return;
  }

  if (event.button === 0 && canvasAnchor.value.isOpen) {
    canvasStore.clearCanvasAnchor();
    useApplicationStore().toggleContextMenu();
  }

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

  findNodesInsideSelection();
};

const onSelectionEnd = () => {
  isSelectionVisible.value = false;
  startPos.value = { x: 0, y: 0 };
  endPos.value = { x: 0, y: 0 };

  if (nodesInside.value.length) {
    selectionStore.selectNodes(nodesInside.value);

    nodesInside.value.forEach((node) => {
      $bus.emit(`node-selection-preview-${node}`, {
        id: node,
        preview: null,
      });
    });

    nodesInside.value = [];
  }

  if (nodesOutside.value.length) {
    selectionStore.deselectNodes(nodesOutside.value);

    nodesOutside.value.forEach((node) => {
      $bus.emit(`node-selection-preview-${node}`, {
        id: node,
        preview: null,
      });
    });

    nodesOutside.value = [];
  }
};

const renderFn = (graphics: GraphicsInst) => {
  graphics.clear();
  graphics.lineStyle(1, $colors.kanvasNodeSelection.activeBorder);
  graphics.beginFill($colors.kanvasNodeSelection.activeBackground);
  graphics.drawRect(
    0,
    0,
    selectionRectangle.value.width ?? 0,
    selectionRectangle.value.height ?? 0,
  );
  graphics.endFill();
};

onMounted(() => {
  $bus.on("selection-pointerdown", onSelectionStart);
  $bus.on("selection-pointermove", onSelectionMove);
  $bus.on("selection-pointerup", onSelectionEnd);
});
</script>

<template>
  <graphics
    v-if="isSelectionVisible"
    :x="selectionRectangle.x"
    :y="selectionRectangle.y"
    @render="renderFn"
  />
</template>
