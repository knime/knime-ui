<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";

import { useDragNodeIntoCanvas } from "@/composables/useDragNodeIntoCanvas";
import { useCanvasModesStore } from "@/store/application/canvasModes";
import { useCanvasStateTrackingStore } from "@/store/application/canvasStateTracking";
import { useSVGCanvasStore } from "@/store/canvas/canvas-svg";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import { useWorkflowStore } from "@/store/workflow/workflow";

const { workflowCanvasState } = storeToRefs(useCanvasStateTrackingStore());
const { hasAnnotationModeEnabled } = storeToRefs(useCanvasModesStore());
const { fillScreen, screenToCanvasCoordinates } = useSVGCanvasStore();
const { isWorkflowEmpty } = storeToRefs(useWorkflowStore());

import SelectionRectangle from "./SelectionRectangle/SelectionRectangle.vue";
import Workflow from "./Workflow.vue";
import WorkflowEmpty from "./WorkflowEmpty.vue";
import AnnotationRectangle from "./annotations/AnnotationRectangle.vue";
import Kanvas from "./kanvas/Kanvas.vue";
import KanvasFilters from "./kanvas/KanvasFilters.vue";

const { onDrop, onDragOver } = useDragNodeIntoCanvas();
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

onMounted(async () => {
  // restore scroll and zoom if saved before
  await useCanvasStateTrackingStore().restoreCanvasState();

  nextTick(() => {
    // put canvas into fillScreen view after loading the workflow
    // if there isn't a saved canvas state for it
    if (!workflowCanvasState.value) {
      fillScreen();
    }
  });
});

const workflow = ref<InstanceType<typeof Workflow>>();

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

  useCanvasAnchoredComponentsStore().openQuickActionMenu({
    props: { position: { x, y } },
  });
};
</script>

<template>
  <Kanvas
    ref="kanvas"
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
    <SelectionRectangle v-else />
  </Kanvas>
</template>
