<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";

import SelectionRectangle from "@/components/workflow/SelectionRectangle/SelectionRectangle.vue";
import Workflow from "@/components/workflow/Workflow.vue";
import WorkflowEmpty from "@/components/workflow/WorkflowEmpty.vue";
import AnnotationRectangle from "@/components/workflow/annotations/AnnotationRectangle.vue";
import Kanvas from "@/components/workflow/kanvas/Kanvas.vue";
import KanvasFilters from "@/components/workflow/kanvas/KanvasFilters.vue";
import { useDropNode } from "@/composables/useDropNode";
import { useCanvasModesStore } from "@/store/application/canvasModes";
import { useCanvasStateTrackingStore } from "@/store/application/canvasStateTracking";
import { useCanvasStore } from "@/store/canvas";
import { useNodeTemplatesStore } from "@/store/nodeTemplates/nodeTemplates";
import { useFloatingMenusStore } from "@/store/workflow/floatingMenus";
import { useWorkflowStore } from "@/store/workflow/workflow";

const { workflowCanvasState } = storeToRefs(useCanvasStateTrackingStore());
const { hasAnnotationModeEnabled } = storeToRefs(useCanvasModesStore());
const { fillScreen, screenToCanvasCoordinates } = useCanvasStore();
const { isWorkflowEmpty } = storeToRefs(useWorkflowStore());
const { isDraggingNodeTemplate } = storeToRefs(useNodeTemplatesStore());

const { onDrop, onDragOver } = useDropNode();
const kanvas = ref<InstanceType<typeof Kanvas>>();

watch(
  isWorkflowEmpty,
  async () => {
    // disable zoom & pan if workflow is empty
    if (isWorkflowEmpty.value) {
      // call to action: move nodes onto workflow
      // for an empty workflow "fillScreen" zooms to 100% and moves the origin (0,0) to the center
      await nextTick();
      fillScreen();
    }
  },
  { immediate: true },
);

onMounted(() => {
  nextTick(() => {
    // put canvas into fillScreen view after loading the workflow
    // if there isn't a saved canvas state for it
    if (!workflowCanvasState.value) {
      fillScreen();
    }
  });
});

const workflow = ref<InstanceType<typeof Workflow>>();

const onNodeSelectionPreview = ($event: { nodeId: string; type: string }) => {
  workflow.value?.applyNodeSelectionPreview($event);
};

const onAnnotationPreview = ($event: {
  annotationId: string;
  type: "hide" | "show" | "clear" | null;
}) => {
  workflow.value?.applyAnnotationSelectionPreview($event);
};

const onContainerSizeUpdated = async () => {
  if (isWorkflowEmpty.value) {
    await nextTick();

    // scroll to center
    fillScreen();
  }
};

const openQuickActionMenu = (event: MouseEvent) => {
  // Check if the event target is specifically the <svg> element inside Kanvas
  if (event.target !== kanvas.value!.$el.querySelector("svg")) {
    return;
  }

  const [x, y] = screenToCanvasCoordinates([event.clientX, event.clientY]);

  useFloatingMenusStore().openQuickActionMenu({
    props: { position: { x, y } },
  });
};
</script>

<template>
  <Kanvas
    id="kanvas"
    ref="kanvas"
    :class="{
      'indicate-node-drag': isWorkflowEmpty && isDraggingNodeTemplate,
    }"
    @drop.stop="onDrop"
    @dragover.prevent.stop="onDragOver"
    @container-size-changed="onContainerSizeUpdated"
    @dblclick.exact="openQuickActionMenu"
  >
    <!-- Includes shadows for Nodes -->
    <KanvasFilters />

    <WorkflowEmpty v-if="isWorkflowEmpty" />
    <template v-else>
      <Workflow ref="workflow" />
    </template>

    <!-- The Annotation- and SelectionRectangle register to the selection-pointer{up,down,move} events of their parent (the Kanvas) -->
    <AnnotationRectangle v-if="hasAnnotationModeEnabled" />
    <SelectionRectangle
      v-else
      @node-selection-preview="onNodeSelectionPreview"
      @annotation-selection-preview="onAnnotationPreview"
    />
  </Kanvas>
</template>

<style scoped>
#kanvas :deep(svg) {
  color: var(--knime-masala);
  background-color: white;
  transition: background-color 150ms;
}

#kanvas.indicate-node-drag :deep(svg) {
  background-color: var(--knime-gray-ultra-light);
}
</style>
