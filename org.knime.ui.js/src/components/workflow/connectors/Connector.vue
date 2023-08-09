<script setup lang="ts">
import { ref, computed, toRef, watch } from "vue";
import gsap from "gsap";
import { useStore } from "@/composables/useStore";
import { useConnectorPosition } from "@/composables/useConnectorPosition";

import * as $shapes from "@/style/shapes.mjs";
import { getMetaOrCtrlKey } from "@/util/navigator";
import { checkPortCompatibility } from "@/util/compatibleConnections";

import { KnimeMIME } from "@/mixins/dropNode";
import connectorPath from "@/util/connectorPath";

interface Props {
  /**
   * Connector id
   */
  id: string;
  /**
   * Node ID of the connector's source node
   */
  sourceNode?: string | null;
  /**
   * Index of the source node's output port that this connector is attached to
   */
  sourcePort?: number | null;
  /**
   * Node ID of the connector's target node
   */
  destNode?: string | null;
  /**
   * Index of the target node's input port that this connector is attached to
   */
  destPort?: number | null;
  /**
   * If either destNode or sourceNode is unspecified the connector will be drawn up to this point
   */
  absolutePoint?: [number, number];
  /**
   * Determines whether the connection can be deleted
   */
  allowedActions: { canDelete: boolean };
  /**
   * Determines whether this connector is streamed at the moment
   */
  streaming?: boolean;
  /**
   * Determines whether this connector is rendered in alternative color
   */
  flowVariableConnection?: boolean;
  /**
   * Whether the connector can be interacted with or not
   */
  interactive?: boolean;
}

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<Props>(), {
  sourceNode: null,
  sourcePort: null,
  destNode: null,
  destPort: null,
  absolutePoint: null,
});

const store = useStore();
const hover = ref(false);
const visiblePath = ref<SVGPathElement | null>(null);
const isDraggedOver = ref(false);
const suggestDelete = ref(false);

const { start, end, sourceNodeObject, destNodeObject } = useConnectorPosition({
  sourceNode: toRef(props, "sourceNode"),
  destNode: toRef(props, "destNode"),
  sourcePort: toRef(props, "sourcePort"),
  destPort: toRef(props, "destPort"),
  absolutePoint: toRef(props, "absolutePoint"),
});

const movePreviewDelta = computed(() => store.state.workflow.movePreviewDelta);
const isDragging = computed(() => store.state.workflow.isDragging);
const isWorkflowWritable = computed(() => store.getters["workflow/isWritable"]);

const isNodeSelected = computed(
  () => store.getters["selection/isNodeSelected"],
);

const path = computed(() => {
  let x1 = start.value.at(0);
  let y1 = start.value.at(1);
  let x2 = end.value.at(0);
  let y2 = end.value.at(1);

  // Update position of source or destination node is being moved
  if (isDragging.value) {
    if (isNodeSelected.value(props.sourceNode)) {
      x1 += movePreviewDelta.value.x;
      y1 += movePreviewDelta.value.y;
    }
    if (isNodeSelected.value(props.destNode)) {
      x2 += movePreviewDelta.value.x;
      y2 += movePreviewDelta.value.y;
    }
  }

  return connectorPath(x1, y1, x2, y2);
});

/*
 * if suggestDelete changes to 'true' the connector will animate away from its target port
 * if suggestDelete changes back to 'false' the connector will move back
 */
watch(suggestDelete, (newValue, oldValue) => {
  if (!visiblePath.value) {
    return;
  }

  if (newValue && !oldValue) {
    const shiftX = -12;
    const shiftY = -6;
    const x1 = start.value.at(0);
    const y1 = start.value.at(1);
    const x2 = end.value.at(0);
    const y2 = end.value.at(1);

    const newPath = connectorPath(x1, y1, x2 + shiftX, y2 + shiftY);

    gsap.to(visiblePath.value, {
      attr: { d: newPath },
      duration: 0.2,
      ease: "power2.out",
    });
  } else if (!newValue && oldValue) {
    gsap.to(visiblePath.value, {
      attr: { d: path.value },
      duration: 0.2,
      ease: "power2.out",
    });
  }
});

const draggedNodeTemplate = computed(
  () => store.state.nodeRepository.draggedNodeData,
);

const isConnectionSelected = computed(
  () => store.getters["selection/isConnectionSelected"],
);

const singleSelectedNode = computed(
  () => store.getters["selection/singleSelectedNode"],
);
const selectedConnections = computed(
  () => store.getters["selection/selectedConnections"],
);

const screenToCanvasCoordinates = computed(
  () => store.getters["canvas/screenToCanvasCoordinates"],
);

const availablePortTypes = computed(
  () => store.state.application.availablePortTypes,
);

const isHighlighted = computed(() => {
  // if only one node and no connections are selected, highlight the connections from and to that node
  return (
    Boolean(singleSelectedNode.value) &&
    selectedConnections.value.length === 0 &&
    (isNodeSelected.value(props.sourceNode) ||
      isNodeSelected.value(props.destNode))
  );
});

const onMouseClick = (event: MouseEvent) => {
  if (event.shiftKey || event[getMetaOrCtrlKey()]) {
    // Multi select
    if (isConnectionSelected.value(props.id)) {
      store.dispatch("selection/deselectConnection", props.id);
    } else {
      store.dispatch("selection/selectConnection", props.id);
    }
  } else {
    store.dispatch("selection/deselectAllObjects");
    store.dispatch("selection/selectConnection", props.id);
  }
};

const onContextMenu = (event: MouseEvent) => {
  // right click should work same as left click
  onMouseClick(event);
  store.dispatch("application/toggleContextMenu", { event });
};

const onIndicateReplacement = ({ detail: { state } }) => {
  suggestDelete.value = state;
};

const hasCompatiblePorts = (replacementInPorts, replacementOutPorts) => {
  const hasCompatibleSrcPort =
    sourceNodeObject.value &&
    replacementInPorts.some((toPort) =>
      checkPortCompatibility({
        fromPort: sourceNodeObject.value.outPorts[props.sourcePort],
        toPort,
        availablePortTypes: availablePortTypes.value,
      }),
    );

  const hasCompatibleDestPort =
    destNodeObject.value &&
    replacementOutPorts.some((fromPort) =>
      checkPortCompatibility({
        fromPort,
        toPort: destNodeObject.value.inPorts[props.destPort],
        availablePortTypes: availablePortTypes.value,
      }),
    );

  return hasCompatibleSrcPort || hasCompatibleDestPort;
};

const onNodeDragLeave = () => {
  isDraggedOver.value = false;
};

const insertNode = ({
  clientX,
  clientY,
  event,
  nodeId = null,
  nodeFactory = null,
}) => {
  if (!isWorkflowWritable.value) {
    return;
  }

  const [x, y] = screenToCanvasCoordinates.value([
    clientX - $shapes.nodeSize / 2,
    clientY - $shapes.nodeSize / 2,
  ]);

  if (props.allowedActions.canDelete) {
    store.dispatch("workflow/insertNode", {
      connectionId: props.id,
      position: { x, y },
      nodeFactory,
      nodeId,
    });
  } else {
    window.alert(
      "Cannot delete connection at this point. Insert node operation aborted.",
    );
    event.detail.onError();
  }
  isDraggedOver.value = false;
};

const onRepositoryNodeDragEnter = (dragEvent: DragEvent) => {
  if (!isWorkflowWritable.value) {
    return;
  }

  if ([...dragEvent.dataTransfer.types].includes(KnimeMIME)) {
    const { inPorts, outPorts } = draggedNodeTemplate.value;

    if (hasCompatiblePorts(inPorts, outPorts)) {
      isDraggedOver.value = true;
    }
  }
};

const onRepositoryNodeDrop = (dragEvent: DragEvent) => {
  const nodeFactory = JSON.parse(dragEvent.dataTransfer.getData(KnimeMIME));
  insertNode({
    clientX: dragEvent.clientX,
    clientY: dragEvent.clientY,
    nodeFactory,
    event: dragEvent,
  });
};

const onWorkflowNodeDragEnter = (event: CustomEvent) => {
  const { isNodeConnected, inPorts, outPorts } = event.detail;

  if (!hasCompatiblePorts(inPorts, outPorts)) {
    return;
  }

  if (isNodeConnected) {
    return;
  }
  event.preventDefault();
  isDraggedOver.value = true;
};

const onWorkflowNodeDragLeave = (dragEvent: CustomEvent) => {
  insertNode({
    clientX: dragEvent.detail.clientX,
    clientY: dragEvent.detail.clientY,
    nodeId: dragEvent.detail.id,
    event: dragEvent,
  });
};
</script>

<template>
  <g :data-connector-id="id" @indicate-replacement.stop="onIndicateReplacement">
    <path
      v-if="interactive"
      :d="path"
      class="hover-area"
      data-hide-in-workflow-preview
      @mouseenter="hover = true"
      @mouseleave="hover = false"
      @click.left="onMouseClick"
      @pointerdown.right="onContextMenu"
      @dragenter="onRepositoryNodeDragEnter"
      @dragleave="onNodeDragLeave"
      @drop.stop="onRepositoryNodeDrop"
      @node-dragging-enter="onWorkflowNodeDragEnter"
      @node-dragging-leave.prevent="onNodeDragLeave"
      @node-dragging-end.prevent="onWorkflowNodeDragLeave"
    />
    <path
      ref="visiblePath"
      :d="path"
      :class="{
        'flow-variable': flowVariableConnection,
        'read-only': !isWorkflowWritable,
        highlighted: isHighlighted,
        dashed: streaming,
        selected: isConnectionSelected(id) && !isDragging,
        'is-dragged-over': isDraggedOver,
      }"
      fill="none"
    />
  </g>
</template>

<style lang="postcss" scoped>
@keyframes dash {
  from {
    stroke-dashoffset: 100;
  }

  to {
    stroke-dashoffset: 0;
  }
}

path:not(.hover-area) {
  pointer-events: none;
  stroke-width: v-bind("$shapes.connectorWidth");
  stroke: var(--knime-stone-gray);
  transition:
    stroke-width 0.1s ease-in,
    stroke 0.1s ease-in;

  &:not(.read-only) {
    cursor: grab;
  }

  &.selected {
    stroke-width: v-bind("$shapes.selectedConnectorWidth");
    stroke: var(--knime-cornflower);
  }

  &.highlighted {
    stroke-width: v-bind("$shapes.highlightedConnectorWidth");
    stroke: var(--knime-masala);
  }

  &.is-dragged-over {
    stroke-width: v-bind("$shapes.selectedConnectorWidth");
    stroke: var(--knime-meadow-dark);
  }

  &.dashed {
    stroke-dasharray: 5;
    stroke-dashoffset: 50;
    animation: dash 3s linear infinite;
  }

  &.flow-variable {
    stroke: var(--knime-coral);

    &.selected {
      stroke: var(--knime-cornflower);
    }
  }
}

.hover-area {
  stroke: transparent;
  stroke-width: 8px;
  fill: none;

  &:hover + path {
    stroke-width: v-bind("$shapes.selectedConnectorWidth");
  }
}
</style>
