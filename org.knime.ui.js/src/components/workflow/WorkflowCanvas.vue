<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from "vue";
import { useStore } from "@/composables/useStore";
import Workflow from "@/components/workflow/Workflow.vue";
import Kanvas from "@/components/workflow/kanvas/Kanvas.vue";
import SelectionRectangle from "@/components/workflow/SelectionRectangle/SelectionRectangle.vue";
import AnnotationRectangle from "@/components/workflow/annotations/AnnotationRectangle.vue";
import WorkflowEmpty from "@/components/workflow/WorkflowEmpty.vue";
import KanvasFilters from "@/components/workflow/kanvas/KanvasFilters.vue";

import { useDropNode } from "@/composables/useDropNode";

const store = useStore();
const { onDrop, onDragOver } = useDropNode();

const isDraggingNodeTemplate = computed(
  () => store.state.nodeTemplates.isDraggingNodeTemplate,
);
const workflowCanvasState = computed(
  () => store.getters["application/workflowCanvasState"],
);

const hasAnnotationModeEnabled = computed(
  () => store.getters["application/hasAnnotationModeEnabled"],
);
const isWorkflowEmpty = computed(
  () => store.getters["workflow/isWorkflowEmpty"],
);

watch(
  isWorkflowEmpty,
  async () => {
    // disable zoom & pan if workflow is empty
    if (isWorkflowEmpty.value) {
      // call to action: move nodes onto workflow
      // for an empty workflow "fillScreen" zooms to 100% and moves the origin (0,0) to the center
      await nextTick();
      store.dispatch("canvas/fillScreen");
    }
  },
  { immediate: true },
);

onMounted(() => {
  nextTick(() => {
    // put canvas into fillScreen view after loading the workflow
    // if there isn't a saved canvas state for it
    if (!workflowCanvasState.value) {
      store.dispatch("canvas/fillScreen");
    }
  });

  const kanvasElement = document.getElementById("kanvas");

  if (kanvasElement) {
    kanvasElement.addEventListener("dblclick", (event: MouseEvent) => {
      const position = { x: event.clientX, y: event.clientY };

      store.dispatch("workflow/openQuickAddNodeMenu", {
        props: { position },
      });
    });
  }
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
    store.dispatch("canvas/fillScreen");
  }
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
