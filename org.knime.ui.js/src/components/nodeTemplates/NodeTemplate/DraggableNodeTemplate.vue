<script setup lang="ts">
import { ref, useTemplateRef } from "vue";
import { storeToRefs } from "pinia";

import type {
  ComponentNodeTemplateWithExtendedPorts,
  NodeTemplateWithExtendedPorts,
} from "@/lib/data-mappers";
import { useAnalyticsService } from "@/services/analytics";
import { usePanelStore } from "@/store/panel";
import type { NodeRepositoryDisplayModesType } from "@/store/settings";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useAddNodeTemplateWithAutoPositioning } from "../useAddNodeTemplateWithAutoPositioning";
import { useDragNodeIntoCanvas } from "../useDragNodeIntoCanvas";

import NodeTemplate from "./NodeTemplate.vue";

/**
 * This component wraps around NodeTemplate to add dragging functionality.
 */

type Props = {
  nodeTemplate:
    | NodeTemplateWithExtendedPorts
    | ComponentNodeTemplateWithExtendedPorts;
  isSelected?: boolean;
  isHighlighted?: boolean;
  isDescriptionActive?: boolean;
  displayMode?: NodeRepositoryDisplayModesType;
  showHelpIcon?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  displayMode: "icon",
  isSelected: false,
  isHighlighted: false,
  isDescriptionActive: false,
  showHelpIcon: true,
});

const emit = defineEmits<{
  showNodeDescription: [];
}>();

const { addNodeWithAutoPositioning, addComponentWithAutoPositioning } =
  useAddNodeTemplateWithAutoPositioning();

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

const autoAddNodeFromTemplate = async (
  nodeTemplate: NodeTemplateWithExtendedPorts,
) => {
  if (nodeTemplate.nodeFactory) {
    const { newNodeId } = await addNodeWithAutoPositioning(
      nodeTemplate.nodeFactory,
    );

    const node = useNodeInteractionsStore().getNodeById(newNodeId ?? "");

    if (node) {
      useAnalyticsService().track("node_created::noderepo_doubleclick_", {
        nodeId: node.id,
        nodeType: node.kind,
        nodeFactoryId: nodeTemplate.nodeFactory.className,
      });
    }

    return;
  }

  if (nodeTemplate.component) {
    addComponentWithAutoPositioning(nodeTemplate.id, nodeTemplate.name);
    return;
  }

  consola.error(
    "Invalid state. NodeTemplate is neither native node nor component",
  );
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
    :show-floating-help-icon="showHelpIcon"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @dblclick="autoAddNodeFromTemplate(nodeTemplate)"
    @drag="dragNodeIntoCanvas.onDrag"
    @help-icon-click="emit('showNodeDescription')"
  />
</template>
