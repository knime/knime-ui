<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useAnnotationInteractionsStore } from "@/store/workflow/annotationInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";

import WorkflowAnnotation from "./WorkflowAnnotation.vue";

const workflowStore = useWorkflowStore();
const { activeWorkflow } = storeToRefs(workflowStore);
const canvasStore = useWebGLCanvasStore();
const { zoomFactor } = storeToRefs(canvasStore);
const { editableAnnotationId } = storeToRefs(useAnnotationInteractionsStore());

const editedWorkflowAnnotation = computed(() => {
  if (!activeWorkflow.value || !editableAnnotationId.value) {
    return undefined;
  }

  return activeWorkflow.value.workflowAnnotations.find(
    ({ id }) => id === editableAnnotationId.value,
  );
});

const screenPosition = computed(() => {
  if (!editedWorkflowAnnotation.value) {
    return undefined;
  }

  const [x, y] = canvasStore.fromCanvasCoordinates([
    editedWorkflowAnnotation.value.bounds.x,
    editedWorkflowAnnotation.value.bounds.y,
  ]);

  return { x, y };
});

const style = computed(() => {
  if (!screenPosition.value || !editedWorkflowAnnotation.value) {
    return {};
  }

  const { width, height } = editedWorkflowAnnotation.value.bounds;
  return {
    left: `${screenPosition.value.x}px`,
    top: `${screenPosition.value.y}px`,
    width: `${width}px`,
    height: `${height}px`,
  };
});
</script>

<template>
  <div
    v-if="editedWorkflowAnnotation"
    class="edited-workflow-annotation"
    :style="style"
  >
    <WorkflowAnnotation :annotation="editedWorkflowAnnotation" />
  </div>
</template>

<style lang="postcss" scoped>
.edited-workflow-annotation {
  position: absolute;
  z-index: v-bind("$zIndices.webGlCanvasFloatingMenus");
  transform: scale(v-bind(zoomFactor));
  transform-origin: top left;
}
</style>
