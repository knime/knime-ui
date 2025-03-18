<script setup lang="ts">
import { storeToRefs } from "pinia";

import { useDropNode } from "@/composables/useDropNode";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import { useWorkflowStore } from "@/store/workflow/workflow";

import Workflow from "./Workflow.vue";
import Kanvas from "./kanvas/Kanvas.vue";

const { onDrop, onDragOver } = useDropNode();
const { activeWorkflow, isWorkflowEmpty } = storeToRefs(useWorkflowStore());

let lastClick = 0;
const openQuickActionMenu = (event: PointerEvent) => {
  if (event.defaultPrevented) {
    return;
  }
  // two clicks in 200ms thats what pixi also does
  if (performance.now() - lastClick > 200) {
    lastClick = performance.now();
    return;
  }

  const [x, y] = useWebGLCanvasStore().screenToCanvasCoordinates([
    event.clientX,
    event.clientY,
  ]);

  useCanvasAnchoredComponentsStore().openQuickActionMenu({
    props: { position: { x, y } },
  });
};
</script>

<template>
  <Kanvas
    v-if="activeWorkflow"
    @drop.stop="onDrop"
    @dragover.prevent.stop="onDragOver"
    @pointerdown.left="openQuickActionMenu"
  >
    <Workflow v-if="!isWorkflowEmpty" />
  </Kanvas>
</template>
