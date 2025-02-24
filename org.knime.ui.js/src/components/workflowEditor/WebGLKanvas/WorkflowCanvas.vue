<script setup lang="ts">
import { onMounted } from "vue";
import { storeToRefs } from "pinia";

import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useWorkflowStore } from "@/store/workflow/workflow";

import Workflow from "./Workflow.vue";
import Kanvas from "./kanvas/Kanvas.vue";

const { activeWorkflow, isWorkflowEmpty } = storeToRefs(useWorkflowStore());
const canvasStore = useWebGLCanvasStore();

onMounted(() => {
  canvasStore.setFactor(1);
  canvasStore.setCanvasOffset({ x: 0, y: 0 });
});
</script>

<template>
  <Kanvas v-if="activeWorkflow">
    <Workflow v-if="!isWorkflowEmpty" />
  </Kanvas>
</template>
