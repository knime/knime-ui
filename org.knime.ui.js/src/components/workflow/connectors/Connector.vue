<script setup lang="ts">
import { ref, computed, toRefs, watch, toRef } from "vue";
import throttle from "raf-throttle";

import type { XY } from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";
import { useConnectorPosition } from "@/composables/useConnectorPosition";
import { getMetaOrCtrlKey } from "@/util/navigator";
import { getBendpointId } from "@/util/connectorUtil";

import type { PathSegment } from "./types";
import { useConnectionReplacement } from "./useConnectionReplacement";
import ConnectorPathSegment from "./ConnectorPathSegment.vue";
import ConnectorBendpoint from "./ConnectorBendpoint.vue";

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
  /**
   * List of coordinates of this connector's bendpoints
   */
  bendpoints?: Array<XY>;
}

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<Props>(), {
  sourceNode: null,
  sourcePort: null,
  destNode: null,
  destPort: null,
  absolutePoint: null,
  interactive: true,
  bendpoints: () => [],
});

const store = useStore();
const suggestDelete = ref(false);

const isHovered = ref(false);
const isDragging = computed(() => store.state.workflow.isDragging);
const movePreviewDelta = computed(() => store.state.workflow.movePreviewDelta);

const isNodeSelected = computed(
  () => store.getters["selection/isNodeSelected"],
);
const isConnectionSelected = computed(
  () => store.getters["selection/isConnectionSelected"],
);
const isBendpointSelected = computed(
  () => store.getters["selection/isBendpointSelected"],
);

const { sourceNode, sourcePort, destNode, destPort, id, absolutePoint } =
  toRefs(props);

const { start: startSegmentPosition, end: endSegmentPosition } =
  useConnectorPosition({
    sourceNode,
    destNode,
    sourcePort,
    destPort,
    absolutePoint,
  });

const pathSegments = computed<Array<PathSegment>>(() => {
  let x1 = startSegmentPosition.value.at(0);
  let y1 = startSegmentPosition.value.at(1);
  let x2 = endSegmentPosition.value.at(0);
  let y2 = endSegmentPosition.value.at(1);

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

  // when there are no bendpoints or we have an absolutePoint means we should
  // treat this connector as a single unsegmented path
  if (props.bendpoints.length === 0 || props.absolutePoint) {
    return [
      {
        isStart: true,
        isEnd: true,
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
      },
    ];
  }

  // include the "start" and "end" coordinates as points
  const allPoints: Array<XY> = [
    { x: x1, y: y1 },
    ...props.bendpoints,
    { x: x2, y: y2 },
  ];

  const segments: Array<PathSegment> = [];
  // then create all the segments in-between those points
  for (let i = 0; i < allPoints.length - 1; i++) {
    const isStart = i === 0;
    const isEnd = i + 1 === allPoints.length - 1;

    const start = allPoints[i];
    const end = allPoints[i + 1];

    // when a given bendpoint is being dragged,
    // we need to adjust the "start" of the current path segment's position
    const startWithDelta: XY =
      !isStart && isBendpointSelected.value(getBendpointId(props.id, i - 1))
        ? {
            x: start.x + movePreviewDelta.value.x,
            y: start.y + movePreviewDelta.value.y,
          }
        : start;

    // and we also need to adjust the "end" of the previous path segment
    const endWithDelta: XY =
      !isEnd && isBendpointSelected.value(getBendpointId(props.id, i))
        ? {
            x: end.x + movePreviewDelta.value.x,
            y: end.y + movePreviewDelta.value.y,
          }
        : end;

    segments.push({
      start: startWithDelta,
      end: endWithDelta,
      isStart,
      isEnd,
    });
  }

  return segments;
});

const isWorkflowWritable = computed(() => store.getters["workflow/isWritable"]);

const singleSelectedNode = computed(
  () => store.getters["selection/singleSelectedNode"],
);
const selectedConnections = computed(
  () => store.getters["selection/selectedConnections"],
);

const screenToCanvasCoordinates = computed(
  () => store.getters["canvas/screenToCanvasCoordinates"],
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

const onConnectionSegmentClick = (event: MouseEvent) => {
  const isMultiselect = event.shiftKey || event[getMetaOrCtrlKey()];

  if (!isMultiselect) {
    store.dispatch("selection/deselectAllObjects");
  }

  const action = isConnectionSelected.value(props.id)
    ? "deselectConnection"
    : "selectConnection";
  store.dispatch(`selection/${action}`, props.id);
};

const onContextMenu = (event: MouseEvent) => {
  // right click should work same as left click
  onConnectionSegmentClick(event);
  store.dispatch("application/toggleContextMenu", { event });
};

const onNodeDragLeave = () => {
  isDraggedOver.value = false;
};

const isMultiselect = (event: MouseEvent | PointerEvent) =>
  event.shiftKey || event[getMetaOrCtrlKey()];

const onBendpointPointerdown = (
  event: PointerEvent,
  index: number,
  position: XY,
) => {
  if (isMultiselect(event)) {
    return;
  }

  const eventTarget = event.target as HTMLElement;

  const bendpointId = getBendpointId(props.id, index - 1);
  if (!isBendpointSelected.value(bendpointId)) {
    store.dispatch("selection/deselectAllObjects");
  }
  store.dispatch("selection/selectBendpoint", bendpointId);

  event.stopPropagation();
  eventTarget.setPointerCapture(event.pointerId);

  const onMove = throttle(({ clientX, clientY }) => {
    const [moveX, moveY] = screenToCanvasCoordinates.value([clientX, clientY]);

    const deltaX = moveX - position.x;
    const deltaY = moveY - position.y;
    store.commit("workflow/setIsDragging", true);
    store.commit("workflow/setMovePreview", {
      deltaX,
      deltaY,
    });
  });

  const onUp = () => {
    eventTarget.releasePointerCapture(event.pointerId);
    store.dispatch("workflow/moveBendpoints");
    event.target.removeEventListener("pointermove", onMove);
    event.target.removeEventListener("pointerup", onUp);
  };

  event.target.addEventListener("pointermove", onMove);
  event.target.addEventListener("pointerup", onUp);
};

watch(
  toRef(props, "bendpoints"),
  () => {
    if (isDragging.value) {
      store.dispatch("workflow/resetDragState");
    }
  },
  { deep: true },
);

const onBendpointClick = (event: MouseEvent, index: number) => {
  if (isDragging.value) {
    return;
  }

  const bendpointId = getBendpointId(props.id, index - 1);

  if (isMultiselect(event)) {
    const action = isBendpointSelected.value(bendpointId)
      ? "deselect"
      : "select";
    store.dispatch(`selection/${action}Bendpoint`, bendpointId);
  } else {
    store.dispatch("selection/deselectAllObjects");
    store.dispatch("selection/selectBendpoint", bendpointId);
  }
};
</script>

<template>
  <g
    :data-connector-id="id"
    @indicate-replacement.stop="suggestDelete = $event.detail.state"
  >
    <template v-for="(segment, index) of pathSegments" :key="index">
      <ConnectorPathSegment
        :segment="segment"
        :is-flowvariable-connection="flowVariableConnection"
        :is-highlighted="isHighlighted"
        :is-dragged-over="isDraggedOver"
        :is-readonly="!isWorkflowWritable"
        :is-selected="isConnectionSelected(id) && !isDragging"
        :interactive="interactive"
        :streaming="streaming"
        :suggest-delete="segment.isEnd && suggestDelete"
        :is-hovered="isHovered"
        @mouseenter="isHovered = true"
        @mouseleave="isHovered = false"
        @click.left="onConnectionSegmentClick"
        @pointerdown.right="onContextMenu"
        @dragenter="onRepositoryNodeDragEnter"
        @dragleave="onNodeDragLeave"
        @drop.stop="onRepositoryNodeDrop"
        @node-dragging-enter="onWorkflowNodeDragEnter"
        @node-dragging-leave.prevent="onNodeDragLeave"
        @node-dragging-end.prevent="onWorkflowNodeDragLeave"
      />

      <ConnectorBendpoint
        v-if="index !== 0"
        :is-selected="isBendpointSelected(getBendpointId(id, index - 1))"
        :is-dragging="isDragging"
        :is-flow-variable-connection="flowVariableConnection"
        :position="pathSegments[index].start"
        :index="index - 1"
        :connection-id="id"
        @pointerdown="
          onBendpointPointerdown($event, index, pathSegments[index].start)
        "
        @click="onBendpointClick($event, index)"
      />
    </template>
  </g>
</template>
