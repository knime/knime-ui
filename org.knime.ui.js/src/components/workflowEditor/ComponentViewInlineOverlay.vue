<script setup lang="ts">
import { computed } from "vue";

import { CURRENT_STATE_VERSION } from "@knime/hub-features/versions";

import type { ComponentNode } from "@/api/gateway-api/generated-api";
import CompositeViewLoader from "@/components/uiExtensions/compositeView/CompositeViewLoader.vue";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useWorkflowStore } from "@/store/workflow/workflow";
import * as $shapes from "@/style/shapes";

/** Height of the node card header in canvas pixels */
const CARD_HEADER_H = 36;

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

const projectId = computed(() => workflowStore.getProjectAndWorkflowIds.projectId);
const workflowId = computed(() => workflowStore.getProjectAndWorkflowIds.workflowId);

/** Top-left of the card body in screen (fixed) coordinates */
const screenPos = computed(() =>
  canvasStore.screenFromCanvasCoordinates({
    x: props.node.position.x,
    y: props.node.position.y + CARD_HEADER_H,
  }),
);

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
  z-index: 1;
}

.component-view-inner {
  transform-origin: top left;
}
</style>
