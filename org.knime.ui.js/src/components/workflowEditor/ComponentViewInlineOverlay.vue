<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";

import { CURRENT_STATE_VERSION } from "@knime/hub-features/versions";

import type { ComponentNode } from "@/api/gateway-api/generated-api";
import CompositeViewLoader from "@/components/uiExtensions/compositeView/CompositeViewLoader.vue";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useSelectionStore } from "@/store/selection";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { useMovingStore } from "@/store/workflow/moving";
import {
  useNodeCustomSizesStore,
  MIN_NODE_CARD_HEIGHT,
  MAX_NODE_CARD_HEIGHT,
  MIN_NODE_CARD_WIDTH,
  MAX_NODE_CARD_WIDTH,
} from "@/store/nodeCustomSizes";
import * as $shapes from "@/style/shapes";

/** Height of the icon/name row that sits above the view area (canvas pixels) */
const CARD_HEADER_H = $shapes.compactNodeCardHeight;

/**
 * Natural (unscaled) width at which CompositeViewLoader renders.
 * CSS-scaled down to match the actual on-screen card body size.
 */
const NATURAL_W = 560;

const props = defineProps<{ node: ComponentNode }>();

const canvasStore = useWebGLCanvasStore();
const workflowStore = useWorkflowStore();
const movingStore = useMovingStore();
const selectionStore = useSelectionStore();
const customSizesStore = useNodeCustomSizesStore();

const { isDragging, movePreviewDelta } = storeToRefs(movingStore);
const { zoomFactor, canvasOffset } = storeToRefs(canvasStore);

const projectId = computed(() => workflowStore.getProjectAndWorkflowIds.projectId);
const workflowId = computed(() => workflowStore.getProjectAndWorkflowIds.workflowId);

const isSelected = computed(() => selectionStore.isNodeSelected(props.node.id));

/** Whether this specific node is currently being dragged */
const isBeingDragged = computed(
  () => isDragging.value && selectionStore.isNodeSelected(props.node.id),
);

const cardTotalH = computed(
  () => customSizesStore.getSize(props.node.id)?.height ?? $shapes.nodeCardHeight,
);
const cardW = computed(
  () => customSizesStore.getSize(props.node.id)?.width ?? $shapes.nodeCardWidth,
);
const cardBodyH = computed(() => cardTotalH.value - CARD_HEADER_H);
const naturalH = computed(() => Math.round((NATURAL_W * cardBodyH.value) / cardW.value));

/**
 * Node position captured at drag start (before store position is mutated).
 * Using this + movePreviewDelta keeps the overlay in sync during drag without
 * double-counting the delta after endDrag updates node.position.
 */
const preDragPos = ref<{ x: number; y: number } | null>(null);

watch(isBeingDragged, (nowDragging) => {
  if (nowDragging) {
    preDragPos.value = { x: props.node.position.x, y: props.node.position.y };
  } else {
    preDragPos.value = null;
  }
});

/** Top-left of the card body in screen (fixed) coordinates */
const screenPos = computed(() => {
  // Reference zoomFactor and canvasOffset so this recomputes on pan/zoom
  // and when the canvas first initializes.
  void zoomFactor.value;
  void canvasOffset.value;
  const base = preDragPos.value
    ? {
        x: preDragPos.value.x + movePreviewDelta.value.x,
        y: preDragPos.value.y + movePreviewDelta.value.y,
      }
    : { x: props.node.position.x, y: props.node.position.y };
  return canvasStore.screenFromCanvasCoordinates({
    x: base.x,
    y: base.y + CARD_HEADER_H,
  });
});

const screenW = computed(() => cardW.value * zoomFactor.value);
const screenH = computed(() => cardBodyH.value * zoomFactor.value);

/** Scale factor that maps NATURAL_W → screenW */
const scale = computed(() => screenW.value / NATURAL_W);

const startResize = (event: MouseEvent) => {
  event.stopPropagation();
  event.preventDefault();
  const startX = event.clientX;
  const startY = event.clientY;
  const startTotalH = cardTotalH.value;
  const startW = cardW.value;
  const onMove = (e: MouseEvent) => {
    const dx = (e.clientX - startX) / zoomFactor.value;
    const dy = (e.clientY - startY) / zoomFactor.value;
    customSizesStore.setSize(props.node.id, {
      width: Math.min(MAX_NODE_CARD_WIDTH, Math.max(MIN_NODE_CARD_WIDTH, startW + dx)),
      height: Math.min(
        MAX_NODE_CARD_HEIGHT,
        Math.max(MIN_NODE_CARD_HEIGHT, startTotalH + dy),
      ),
    });
  };
  const onUp = () => {
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  };
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
};
</script>

<template>
  <div
    class="component-view-inline-overlay"
    :style="{
      left: `${screenPos.x}px`,
      top: `${screenPos.y}px`,
      width: `${screenW}px`,
      height: `${screenH}px`,
    }"
  >
    <div
      class="component-view-inner"
      :style="{
        width: `${NATURAL_W}px`,
        height: `${naturalH}px`,
        transform: `scale(${scale})`,
      }"
    >
      <Suspense>
        <CompositeViewLoader
          :project-id="projectId"
          :workflow-id="workflowId"
          :node-id="node.id"
          :execution-state="node.state?.executionState"
          @loading-state-change="() => {}"
          @pagebuilder-has-page="() => {}"
        />
      </Suspense>
    </div>
    <div v-if="isSelected" class="resize-handle" @mousedown="startResize" />
  </div>
</template>

<style scoped>
.component-view-inline-overlay {
  position: fixed;
  overflow: hidden;
  pointer-events: none;
  z-index: 5;
}

.component-view-inner {
  transform-origin: top left;
}

.resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 16px;
  height: 16px;
  cursor: se-resize;
  pointer-events: auto;
  background: linear-gradient(
    135deg,
    transparent 40%,
    rgb(100 100 100 / 50%) 40%
  );
  border-radius: 0 0 4px 0;
  z-index: 1;
}
</style>
