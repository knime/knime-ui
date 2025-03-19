<script setup lang="ts">
import { storeToRefs } from "pinia";

import { useDropNode } from "@/composables/useDropNode";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import { useWorkflowStore } from "@/store/workflow/workflow";

import Workflow from "./Workflow.vue";
import { usePointerDownDoubleClick } from "./common/usePointerDownDoubleClick";
import Kanvas from "./kanvas/Kanvas.vue";

const { onDrop, onDragOver } = useDropNode();
const { activeWorkflow, isWorkflowEmpty } = storeToRefs(useWorkflowStore());

const openQuickActionMenu = (event: PointerEvent) => {
  const [x, y] = useWebGLCanvasStore().screenToCanvasCoordinates([
    event.clientX,
    event.clientY,
  ]);

  useCanvasAnchoredComponentsStore().openQuickActionMenu({
    props: { position: { x, y } },
  });
};

const { pointerDownDoubleClick } = usePointerDownDoubleClick({
  handler: openQuickActionMenu,
  checkForPreventDefault: true,
});
</script>

<template>
  <Kanvas
    v-if="activeWorkflow"
    @drop.stop="onDrop"
    @dragover.prevent.stop="onDragOver"
    @pointerdown="pointerDownDoubleClick"
  >
    <Workflow v-if="!isWorkflowEmpty" />
  </Kanvas>
</template>
