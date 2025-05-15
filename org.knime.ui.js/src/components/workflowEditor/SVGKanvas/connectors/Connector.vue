<script setup lang="ts">
import { computed, nextTick, ref, toRefs } from "vue";
import { storeToRefs } from "pinia";

import { navigatorUtils } from "@knime/utils";

import type { XY } from "@/api/gateway-api/generated-api";
import { useMoveObject } from "@/components/workflowEditor/SVGKanvas/common/useMoveObject";
import { useSVGCanvasStore } from "@/store/canvas/canvas-svg";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import { useSelectionStore } from "@/store/selection";
import { useConnectionInteractionsStore } from "@/store/workflow/connectionInteractions";
import { useMovingStore } from "@/store/workflow/moving";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { getBendpointId } from "@/util/connectorUtil";
import { useConnectorPathSegments } from "../../common/useConnectorPathSegments";
import type { AbsolutePointTuple, ConnectorProps } from "../../types";
import { isMultiselectEvent } from "../../util/isMultiselectEvent";

import ConnectorBendpoint from "./ConnectorBendpoint.vue";
import ConnectorPathSegment from "./ConnectorPathSegment.vue";
import { useConnectionReplacement } from "./useConnectionReplacement";

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<ConnectorProps<AbsolutePointTuple>>(), {
  sourceNode: null,
  sourcePort: null,
  destNode: null,
  destPort: null,
  absolutePoint: null,
  interactive: true,
  bendpoints: () => [],
});

const { isDragging } = storeToRefs(useMovingStore());
const selectionStore = useSelectionStore();
const { singleSelectedNode, getSelectedConnections: selectedConnections } =
  storeToRefs(selectionStore);
const { isNodeSelected, isConnectionSelected, isBendpointSelected } =
  selectionStore;
const { isWritable: isWorkflowWritable } = storeToRefs(useWorkflowStore());
const { screenToCanvasCoordinates } = storeToRefs(useSVGCanvasStore());
const { toggleContextMenu } = useCanvasAnchoredComponentsStore();
const { addVirtualBendpoint, addBendpoint } = useConnectionInteractionsStore();

const suggestDelete = ref(false);

const isHovered = ref(false);

const {
  sourceNode,
  sourcePort,
  destNode,
  destPort,
  id,
  absolutePoint,
  bendpoints,
} = toRefs(props);

const { pathSegments } = useConnectorPathSegments({
  id: props.id,
  sourceNode,
  destNode,
  sourcePort,
  destPort,
  absolutePoint,
  bendpoints,
});

const isHighlighted = computed(() => {
  // if only one node and no connections are selected, highlight the connections from and to that node
  return (
    Boolean(singleSelectedNode.value) &&
    selectedConnections.value.length === 0 &&
    (isNodeSelected(props.sourceNode ?? "") ||
      isNodeSelected(props.destNode ?? ""))
  );
});

const {
  isDraggedOver,
  onRepositoryNodeDragEnter,
  onRepositoryNodeDrop,
  onWorkflowNodeDragEnter,
  onWorkflowNodeDragLeave,
} = useConnectionReplacement({
  id,
  sourceNode,
  sourcePort,
  destNode,
  destPort,
  allowedActions: props.allowedActions,
});

const onConnectionSegmentClick = async (event: MouseEvent) => {
  if (!isMultiselectEvent(event)) {
    const { wasAborted } = await selectionStore.deselectAllObjects();
    if (wasAborted) {
      return;
    }
  }

  const action = isConnectionSelected(props.id)
    ? selectionStore.deselectConnections
    : selectionStore.selectConnections;

  action(props.id);
};

const onContextMenu = async (event: MouseEvent) => {
  // right click should work same as left click
  await onConnectionSegmentClick(event);
  await toggleContextMenu({ event });
};

const onNodeDragLeave = () => {
  isDraggedOver.value = false;
};

const virtualBendpoint = ref<{ index: number; position: XY } | null>(null);
const itemRefs = ref<{ $el: HTMLElement }[]>([]);

const onVirtualBendpointAdded = ({
  position,
  index,
  event,
}: {
  position: XY;
  index: number;
  event: PointerEvent;
}) => {
  addVirtualBendpoint({
    position,
    connectionId: props.id,
    index,
  });

  const [x, y] = screenToCanvasCoordinates.value([
    event.clientX,
    event.clientY,
  ]);

  virtualBendpoint.value = {
    index,
    position: { x, y },
  };

  // after virtual bendpoints are added to the store they will be rendered
  // as if they were real bendpoints. But since the original pointer event
  // happened on a different element we now redispatch it to the correct
  // element so that the normal click&drag logic can happen
  event.stopPropagation();
  const ptrEvent = new PointerEvent("pointerdown", {
    clientX: event.clientX,
    clientY: event.clientY,
    pointerId: event.pointerId,
  });

  nextTick(() => {
    itemRefs.value[index].$el.dispatchEvent(ptrEvent);
  });
};

const { createPointerDownHandler } = useMoveObject({
  useGridSnapping: false,
  onMoveEndCallback: () => {
    if (virtualBendpoint.value) {
      addBendpoint({
        connectionId: props.id,
        position: virtualBendpoint.value.position,
        index: virtualBendpoint.value.index,
      });
      virtualBendpoint.value = null;

      return Promise.resolve(false);
    }

    return Promise.resolve(true);
  },
});

const onBendpointPointerdown = async (
  event: PointerEvent,
  index: number,
  position: XY,
) => {
  if (isMultiselectEvent(event)) {
    return;
  }
  const currentTarget = event.currentTarget as HTMLElement;

  const bendpointId = getBendpointId(props.id, index - 1);
  if (!isBendpointSelected(bendpointId)) {
    const { wasAborted } = await selectionStore.deselectAllObjects();
    if (wasAborted) {
      return;
    }
  }
  selectionStore.selectBendpoints(bendpointId);

  const handler = createPointerDownHandler(computed(() => position));
  handler(event, currentTarget);
};

const onBendpointClick = async (event: MouseEvent, index: number) => {
  if (isDragging.value) {
    return;
  }

  const bendpointId = getBendpointId(props.id, index - 1);

  if (isMultiselectEvent(event)) {
    const action = isBendpointSelected(bendpointId)
      ? selectionStore.deselectBendpoints
      : selectionStore.selectBendpoints;

    action(bendpointId);
  } else {
    const { wasAborted } = await selectionStore.deselectAllObjects();
    if (wasAborted) {
      return;
    }
    selectionStore.selectBendpoints(bendpointId);
  }
};

const hoveredBendpoint = ref<number | null>(null);

const isBendpointVisible = computed(() => {
  return (
    isConnectionSelected(props.id) || isHighlighted.value || isHovered.value
  );
});

const setHoveredBendpoint = (isHovered: boolean, index: number) => {
  hoveredBendpoint.value = isHovered ? index : null;
};

const onBendpointRightClick = async (event: PointerEvent, index: number) => {
  const bendpointId = getBendpointId(props.id, index - 1);

  hoveredBendpoint.value = index - 1;
  selectionStore.selectBendpoints(bendpointId);
  await toggleContextMenu({ event });
};
</script>

<template>
  <g
    :data-connector-id="id"
    @indicate-replacement.stop="suggestDelete = $event.detail.state"
  >
    <template v-for="(segment, index) of pathSegments" :key="index">
      <ConnectorPathSegment
        :connection-id="id"
        :segment="segment"
        :index="index"
        :is-flowvariable-connection="Boolean(flowVariableConnection)"
        :is-highlighted="isHighlighted"
        :is-dragged-over="isDraggedOver"
        :is-readonly="!isWorkflowWritable"
        :is-last-segment="index === pathSegments.length - 1"
        :is-selected="isConnectionSelected(id) && !isDragging"
        :interactive="interactive"
        :streaming="streaming"
        :suggest-delete="Boolean(segment.isEnd && suggestDelete)"
        :is-connection-hovered="isHovered"
        @mouseenter="isHovered = true"
        @mouseleave="isHovered = false"
        @click.left="onConnectionSegmentClick"
        @pointerdown.right="onContextMenu"
        @pointerdown.left.ctrl="
          navigatorUtils.isMac() ? onContextMenu($event) : null
        "
        @dragenter="onRepositoryNodeDragEnter"
        @dragleave="onNodeDragLeave"
        @drop.stop="onRepositoryNodeDrop"
        @node-dragging-enter="onWorkflowNodeDragEnter"
        @node-dragging-leave.prevent="onNodeDragLeave"
        @node-dragging-end.prevent="onWorkflowNodeDragLeave"
        @add-virtual-bendpoint="onVirtualBendpointAdded({ ...$event, index })"
      />

      <ConnectorBendpoint
        v-if="index !== 0"
        ref="itemRefs"
        :is-selected="isBendpointSelected(getBendpointId(id, index - 1))"
        :is-dragging="isDragging"
        :is-flow-variable-connection="Boolean(flowVariableConnection)"
        :position="pathSegments[index].start"
        :index="index - 1"
        :connection-id="id"
        :interactive="interactive && isWorkflowWritable"
        :is-visible="isBendpointVisible || hoveredBendpoint === index - 1"
        @mouseenter="setHoveredBendpoint(true, index - 1)"
        @mouseleave="setHoveredBendpoint(false, index - 1)"
        @pointerdown.left="
          onBendpointPointerdown($event, index, pathSegments[index].start)
        "
        @pointerdown.right="onBendpointRightClick($event, index)"
        @click="onBendpointClick($event, index)"
      />
    </template>
  </g>
</template>
