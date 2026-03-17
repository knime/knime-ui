<script setup lang="ts">
import { computed, ref, useTemplateRef } from "vue";

import { NodePreview } from "@knime/components";

import type { KnimeNode } from "@/api/custom-types";
import {
  type ComponentNodeTemplateWithExtendedPorts,
  type NodeTemplateWithExtendedPorts,
  nodeTemplate as nodeTemplateMappers,
} from "@/lib/data-mappers";
import { usePanelStore } from "@/store/panel";
import type { NodeRepositoryDisplayModesType } from "@/store/settings";
import { useDragNodeIntoCanvas } from "../dragIntoCanvas";
import { useAddNodeTemplateWithAutoPositioning } from "../useAddNodeTemplateWithAutoPositioning";

import NodeTemplateIconMode from "./NodeTemplateIconMode.vue";
import NodeTemplateListMode from "./NodeTemplateListMode.vue";

/**
 * This component renders a native node or component template. It can provide drag&drop functionality
 * which lets you add the template into the canvas as a real node
 */

type Props = {
  nodeTemplate:
    | NodeTemplateWithExtendedPorts
    | ComponentNodeTemplateWithExtendedPorts;
  isSelected?: boolean;
  isHighlighted?: boolean;
  isDescriptionActive?: boolean;
  displayMode?: NodeRepositoryDisplayModesType;
  allowShowingDetails?: boolean;
  draggable?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  displayMode: "icon",
  isSelected: false,
  isHighlighted: false,
  isDescriptionActive: false,
  allowShowingDetails: true,
  draggable: true,
});

const emit = defineEmits<{
  toggleDetails: [];
  dblClickInsertNode: [
    {
      newNodeId: string;
      template: NodeTemplateWithExtendedPorts;
      connectedTo?: { node: KnimeNode };
    },
  ];
  dblClickInsertComponent: [
    { template: ComponentNodeTemplateWithExtendedPorts },
  ];
  dragDropInsertNode: [
    {
      newNodeId: string;
      template: NodeTemplateWithExtendedPorts;
    },
  ];
  dragDropInsertComponent: [
    { template: ComponentNodeTemplateWithExtendedPorts },
  ];
}>();

const { addNodeWithAutoPositioning, addComponentWithAutoPositioning } =
  useAddNodeTemplateWithAutoPositioning();

const panelStore = usePanelStore();

const shouldShowDescriptionOnAbort = ref(false);
const dragNodeIntoCanvas = useDragNodeIntoCanvas.dragSource();

const nodePreview = useTemplateRef("nodePreview");

const ghostElementId = "draggable-node-ghost";
const createDragGhost = () => {
  // clone node preview
  const dragGhost = nodePreview.value.$el.cloneNode(true) as HTMLElement;

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
  panelStore.closeExtensionPanel();

  dragNodeIntoCanvas.onDragStart(event, props.nodeTemplate, {
    createDragGhost,
    onNodeAdded: (payload) => {
      if (payload.type === "node") {
        emit("dragDropInsertNode", {
          newNodeId: payload.newNodeId,
          template: props.nodeTemplate,
        });
      }

      if (payload.type === "component") {
        emit("dragDropInsertComponent", {
          template:
            props.nodeTemplate as ComponentNodeTemplateWithExtendedPorts,
        });
      }
    },
  });
};

const onDragEnd = (event: DragEvent) => {
  const { wasAborted } = dragNodeIntoCanvas.onDragEnd(event);

  const dragGhost = document.querySelector(`#${ghostElementId}`);
  if (dragGhost) {
    document.body.removeChild(dragGhost);
  }

  if (wasAborted && shouldShowDescriptionOnAbort.value) {
    emit("toggleDetails");
  }
};

const autoAddNodeFromTemplate = async (
  nodeTemplate:
    | NodeTemplateWithExtendedPorts
    | ComponentNodeTemplateWithExtendedPorts,
) => {
  if (nodeTemplateMappers.isComponentNodeTemplate(nodeTemplate)) {
    await addComponentWithAutoPositioning(nodeTemplate.id, nodeTemplate.name);
    emit("dblClickInsertComponent", { template: nodeTemplate });
  } else {
    const { newNodeId, connectedTo } = await addNodeWithAutoPositioning(
      nodeTemplate.nodeFactory!,
    );

    if (newNodeId) {
      emit("dblClickInsertNode", {
        newNodeId,
        template: nodeTemplate,
        connectedTo,
      });
    }
  }
};

const templateComponent = computed(() =>
  props.displayMode === "icon" ? NodeTemplateIconMode : NodeTemplateListMode,
);

const isHovered = ref(false);
</script>

<template>
  <Component
    :is="templateComponent"
    :class="[
      'node',
      {
        'list-mode': displayMode === 'list',
        'tree-mode': displayMode === 'tree',
        selected: isSelected,
        highlighted: isHighlighted,
      },
    ]"
    :draggable="draggable"
    :node-template="nodeTemplate"
    :is-hovered="isHovered"
    :display-mode="displayMode"
    :is-highlighted="isHighlighted"
    :is-description-active="isDescriptionActive"
    :show-floating-help-icon="allowShowingDetails"
    :is-selected="isSelected"
    @pointerenter="isHovered = true"
    @pointerleave="isHovered = false"
    @help-icon-click="emit('toggleDetails')"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @drag="dragNodeIntoCanvas.onDrag"
    @dblclick="autoAddNodeFromTemplate(nodeTemplate)"
  >
    <template #node-preview>
      <NodePreview
        ref="nodePreview"
        :type="nodeTemplate.type"
        :in-ports="nodeTemplate.inPorts"
        :out-ports="nodeTemplate.outPorts"
        :icon="nodeTemplate.icon"
        :is-component="nodeTemplate.component"
      />
    </template>
  </Component>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.node {
  margin: 0;
  position: relative;
  font-size: 12px;

  &:hover {
    cursor: pointer;
  }

  &[draggable="true"]:hover {
    cursor: grab;
  }
}

.highlighted {
  outline: calc(v-bind("$shapes.selectedNodeStrokeWidth") * 1px) solid
    var(--knime-dove-gray);
  border-radius: calc(v-bind("$shapes.selectedItemBorderRadius") * 1px);
  background-color: var(--knime-porcelain);

  &.list-mode,
  &.tree-mode {
    border-radius: 2px;
  }
}

/* selected needs to come after highlighted */
.selected {
  outline: calc(v-bind("$shapes.selectedNodeStrokeWidth") * 1px) solid
    var(--knime-cornflower);
  border-radius: calc(v-bind("$shapes.selectedItemBorderRadius") * 1px);
  background-color: var(--knime-cornflower-semi);
  color: var(--knime-cornflower-dark);

  &.list-mode,
  &.tree-mode {
    border-radius: 2px;
  }
}
</style>
