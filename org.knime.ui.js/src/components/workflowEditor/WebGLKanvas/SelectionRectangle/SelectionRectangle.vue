<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { GraphicsInst } from "vue3-pixi";
import type { Store } from "vuex";

import type { XY } from "@/api/gateway-api/generated-api";
import { $bus } from "@/plugins/event-bus";
import type { RootStoreState } from "@/store/types";
import * as $colors from "@/style/colors";
import { findObjectsForSelection } from "../../util/findObjectsForSelection";

// TODO: fix store injection
declare let store: Store<RootStoreState>;

const isDragging = computed(() => store.state.workflow.isDragging);
const zoomFactor = computed(() => store.state.canvasWebGL.zoomFactor);
const canvasAnchor = computed(() => store.state.canvasWebGL.canvasAnchor);

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
      workflow: store.state.workflow.activeWorkflow!,
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

const onSelectionStart = (event) => {
  if (isDragging.value || event.defaultPrevented) {
    return;
  }

  if (event.button === 0 && canvasAnchor.value.isOpen) {
    store.commit("canvasWebGL/clearCanvasAnchor");
    store.dispatch("application/toggleContextMenu");
  }

  store.dispatch("selection/deselectAllObjects");
  isSelectionVisible.value = true;

  const { offsetX, offsetY } = event;
  startPos.value = {
    x: (offsetX - store.state.canvasWebGL.canvasOffset.x) / zoomFactor.value,
    y: (offsetY - store.state.canvasWebGL.canvasOffset.y) / zoomFactor.value,
  };
  endPos.value = {
    x: startPos.value.x,
    y: startPos.value.y,
  };
};

const onSelectionMove = (event) => {
  if (!isSelectionVisible.value || isDragging.value) {
    return;
  }

  const { offsetX, offsetY } = event;

  endPos.value = {
    x: (offsetX - store.state.canvasWebGL.canvasOffset.x) / zoomFactor.value,
    y: (offsetY - store.state.canvasWebGL.canvasOffset.y) / zoomFactor.value,
  };

  findNodesInsideSelection();
};

const onSelectionEnd = () => {
  isSelectionVisible.value = false;
  startPos.value = { x: 0, y: 0 };
  endPos.value = { x: 0, y: 0 };

  if (nodesInside.value.length) {
    store.dispatch("selection/selectNodes", nodesInside.value);

    nodesInside.value.forEach((node) => {
      $bus.emit(`node-selection-preview-${node}`, {
        id: node,
        preview: null,
      });
    });

    nodesInside.value = [];
  }

  if (nodesOutside.value.length) {
    store.dispatch("selection/deselectNodes", nodesOutside.value);

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
