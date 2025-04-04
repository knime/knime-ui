<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useAnnotationInteractionsStore } from "@/store/workflow/annotationInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";

import WorkflowAnnotation from "./WorkflowAnnotation.vue";
import { TRANSFORM_DELAY_MS } from "./constants";

const workflowStore = useWorkflowStore();
const { activeWorkflow } = storeToRefs(workflowStore);
const canvasStore = useWebGLCanvasStore();
const { zoomFactor } = storeToRefs(canvasStore);

const { editableAnnotationId, activeTransform } = storeToRefs(
  useAnnotationInteractionsStore(),
);

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

const screenPosition = computed(() => {
  if (!bounds.value) {
    return undefined;
  }

  const [canvasX, canvasY] = canvasStore.fromCanvasCoordinates([
    bounds.value.x,
    bounds.value.y,
  ]);

  return {
    x: canvasX,
    y: canvasY,
  };
});

const wrapperStyles = computed(() => {
  if (
    !screenPosition.value ||
    !activeWorkflowAnnotation.value ||
    !bounds.value
  ) {
    return {};
  }

  const { width, height } = bounds.value;

  return {
    left: `${screenPosition.value.x}px`,
    top: `${screenPosition.value.y}px`,
    width: `${width}px`,
    height: `${height}px`,
  };
});
</script>

<template>
  <Transition name="fade">
    <div
      v-if="activeWorkflowAnnotation"
      class="edited-workflow-annotation"
      :style="wrapperStyles"
    >
      <WorkflowAnnotation :annotation="activeWorkflowAnnotation" />
    </div>
  </Transition>
</template>

<style lang="postcss" scoped>
.edited-workflow-annotation {
  position: absolute;
  z-index: v-bind("$zIndices.webGlCanvasFloatingMenus");
  transform: scale(v-bind(zoomFactor));
  transform-origin: top left;
}

.fade-leave-active {
  /* add very subtle and fast transition to avoid content flashes
  when the webgl annotation updates its text */
  transition: opacity 0.01s linear;
  transition-delay: v-bind("`${TRANSFORM_DELAY_MS}ms`");
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
