<script setup lang="ts">
import { ref, useTemplateRef } from "vue";
import { storeToRefs } from "pinia";

import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";
import { useAddNodeToWorkflow } from "@/composables/useAddNodeToWorkflow";
import { useDragNodeIntoCanvas } from "@/composables/useDragNodeIntoCanvas";
import { usePanelStore } from "@/store/panel";
import type { NodeRepositoryDisplayModesType } from "@/store/settings";
import NodeTemplate from "../NodeTemplate/NodeTemplate.vue";

/**
 * This component wraps around NodeTemplate to add dragging functionality.
 */

type Props = {
  nodeTemplate: NodeTemplateWithExtendedPorts;
  isSelected?: boolean;
  isHighlighted?: boolean;
  isDescriptionActive?: boolean;
  displayMode?: NodeRepositoryDisplayModesType;
};

const props = withDefaults(defineProps<Props>(), {
  displayMode: "icon",
  isSelected: false,
  isHighlighted: false,
  isDescriptionActive: false,
});

const emit = defineEmits<{
  showNodeDescription: [];
}>();

const addNodeToWorkflow = useAddNodeToWorkflow();

const panelStore = usePanelStore();
const { isExtensionPanelOpen } = storeToRefs(panelStore);

const shouldShowDescriptionOnAbort = ref(false);
const dragNodeIntoCanvas = useDragNodeIntoCanvas();

const nodeTemplateRef = useTemplateRef("nodeTemplate");

const ghostElementId = "draggable-node-ghost";
const createDragGhost = () => {
  // clone node preview
  const dragGhost = nodeTemplateRef
    .value!.getNodePreview()
    .$el.cloneNode(true) as HTMLElement;

  dragGhost.id = ghostElementId;
  // position it outside the view of the user
  dragGhost.style.position = "absolute";
  dragGhost.style.left = "-100px";
  dragGhost.style.top = "0px";
  dragGhost.style.width = "70px";
  dragGhost.style.height = "70px";
  document.body.appendChild(dragGhost);

  // this ensures no other element (like the name) will be part of the drag-ghost bitmap
  const rect = dragGhost.getBoundingClientRect();

  return { element: dragGhost, size: rect };
};

const onDragStart = (event: DragEvent) => {
  // close description panel
  shouldShowDescriptionOnAbort.value =
    props.isSelected && isExtensionPanelOpen.value;
  panelStore.closeExtensionPanel();

  dragNodeIntoCanvas.onDragStart(event, props.nodeTemplate, createDragGhost);
};

const onDragEnd = (event: DragEvent) => {
  const { wasAborted } = dragNodeIntoCanvas.onDragEnd(event);

  const dragGhost = document.querySelector(`#${ghostElementId}`);
  if (dragGhost) {
    document.body.removeChild(dragGhost);
  }

  if (wasAborted && shouldShowDescriptionOnAbort.value) {
    emit("showNodeDescription");
  }
};
</script>

<template>
  <NodeTemplate
    v-if="nodeTemplate"
    ref="nodeTemplate"
    draggable="true"
    :node-template="nodeTemplate"
    :display-mode="displayMode"
    :is-selected="isSelected"
    :is-highlighted="isHighlighted"
    :is-description-active="isDescriptionActive"
    :show-floating-help-icon="true"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @dblclick="addNodeToWorkflow(nodeTemplate)"
    @drag="dragNodeIntoCanvas.onDrag"
    @help-icon-click="emit('showNodeDescription')"
  />
</template>
