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
import * as $shapes from "@/style/shapes";

/** Height of the icon/name row that sits above the view area (canvas pixels) */
const CARD_HEADER_H = $shapes.compactNodeCardHeight;

/**
 * Natural (unscaled) width at which CompositeViewLoader renders.
 * CSS-scaled down to match the actual on-screen card body size.
 */
const NATURAL_W = 560;
const NATURAL_H = Math.round(
  (NATURAL_W * ($shapes.nodeCardHeight - CARD_HEADER_H)) / $shapes.nodeCardWidth,
);

const props = defineProps<{ node: ComponentNode }>();

const canvasStore = useWebGLCanvasStore();
const workflowStore = useWorkflowStore();
const movingStore = useMovingStore();
const selectionStore = useSelectionStore();

const { isDragging, movePreviewDelta } = storeToRefs(movingStore);

const projectId = computed(() => workflowStore.getProjectAndWorkflowIds.projectId);
const workflowId = computed(() => workflowStore.getProjectAndWorkflowIds.workflowId);

/** Whether this specific node is currently being dragged */
const isBeingDragged = computed(
  () => isDragging.value && selectionStore.isNodeSelected(props.node.id),
);

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

const screenW = computed(() => $shapes.nodeCardWidth * canvasStore.zoomFactor);
const screenH = computed(
  () => ($shapes.nodeCardHeight - CARD_HEADER_H) * canvasStore.zoomFactor,
);

/** Scale factor that maps NATURAL_W → screenW */
const scale = computed(() => screenW.value / NATURAL_W);
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
        height: `${NATURAL_H}px`,
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
</style>
