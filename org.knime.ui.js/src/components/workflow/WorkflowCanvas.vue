<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";

import SelectionRectangle from "@/components/workflow/SelectionRectangle/SelectionRectangle.vue";
import Workflow from "@/components/workflow/Workflow.vue";
import WorkflowEmpty from "@/components/workflow/WorkflowEmpty.vue";
import AnnotationRectangle from "@/components/workflow/annotations/AnnotationRectangle.vue";
import Kanvas from "@/components/workflow/kanvas/Kanvas.vue";
import KanvasFilters from "@/components/workflow/kanvas/KanvasFilters.vue";
import { useDropNode } from "@/composables/useDropNode";
import { useStore } from "@/composables/useStore";

const store = useStore();
const { onDrop, onDragOver } = useDropNode();
const kanvas = ref<InstanceType<typeof Kanvas>>();

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

const canShow = ref(false);

onMounted(async () => {
  if (isWorkflowEmpty.value) {
    canShow.value = true;
    return;
  }

  await nextTick();
  await store.dispatch("canvas/restoreScrollState", workflowCanvasState.value);
  // add a small wait time so that the scroll state gets settled and rendered properly by the browser
  await new Promise((r) => setTimeout(r, 100));
  canShow.value = true;
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

const openQuickActionMenu = (event: MouseEvent) => {
  // Check if the event target is specifically the <svg> element inside Kanvas
  if (event.target !== kanvas.value!.$el.querySelector("svg")) {
    return;
  }

  const [x, y] = store.getters["canvas/screenToCanvasCoordinates"]([
    event.clientX,
    event.clientY,
  ]);

  store.dispatch("workflow/openQuickActionMenu", {
    props: { position: { x, y } },
    event,
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
    :style="{ opacity: canShow ? 1 : 0 }"
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
