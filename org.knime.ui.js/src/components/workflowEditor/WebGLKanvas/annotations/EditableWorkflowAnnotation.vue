<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { useAnnotationInteractionsStore } from "@/store/workflow/annotationInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import FloatingHTML from "../common/FloatingHTML.vue";

import WorkflowAnnotation from "./WorkflowAnnotation.vue";

const workflowStore = useWorkflowStore();
const { activeWorkflow } = storeToRefs(workflowStore);

const { editableAnnotationId, activeTransform } = storeToRefs(
  useAnnotationInteractionsStore(),
);

const isResizingAnnotation = computed(() => {
  if (!activeWorkflow.value || !activeTransform.value) {
    return false;
  }

  return activeWorkflow.value.workflowAnnotations.some(
    ({ id }) => id === activeTransform.value?.annotationId,
  );
});

const activeWorkflowAnnotation = computed(() => {
  if (
    !activeWorkflow.value ||
    (!editableAnnotationId.value && !activeTransform.value)
  ) {
    return undefined;
  }

  const annotationId =
    activeTransform.value?.annotationId ?? editableAnnotationId.value;

  return activeWorkflow.value.workflowAnnotations.find(
    ({ id }) => id === annotationId,
  );
});

const bounds = computed(() => {
  if (!activeWorkflowAnnotation.value) {
    return undefined;
  }

  return activeTransform.value &&
    activeTransform.value.annotationId === activeWorkflowAnnotation.value.id
    ? activeTransform.value.bounds
    : activeWorkflowAnnotation.value.bounds;
});
</script>

<template>
  <FloatingHTML
    :active="Boolean(activeWorkflowAnnotation)"
    :canvas-position="bounds"
    :dimensions="bounds"
  >
    <WorkflowAnnotation
      v-if="activeWorkflowAnnotation"
      :annotation="activeWorkflowAnnotation"
      :is-resizing="isResizingAnnotation"
    />
  </FloatingHTML>
</template>
