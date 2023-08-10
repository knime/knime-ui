<script setup lang="ts">
import { ref, computed, toRefs } from "vue";

import type { XY } from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";
import { useConnectorPosition } from "@/composables/useConnectorPosition";
import { geometry } from "@/util/geometry";
import { getMetaOrCtrlKey } from "@/util/navigator";

import ConnectorPathSegment from "./ConnectorPathSegment.vue";
import { useConnectionReplacement } from "./useConnectionReplacement";
import type { PathSegment } from "./types";

const MOCK_BENDPOINTS: Array<XY> = [
  { x: -1458, y: -638 },
  { x: -1258, y: -638 },
  { x: -1198, y: -638 },
];

const BENDPOINTS = ref(MOCK_BENDPOINTS);

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
  interactive: true,
});

const store = useStore();
const suggestDelete = ref(false);
const isDraggingBendPoint = ref(false);
const bendPointDragDelta = ref({ x: 0, y: 0, index: -1 });

const isDragging = computed(() => store.state.workflow.isDragging);
const movePreviewDelta = computed(() => store.state.workflow.movePreviewDelta);

const isNodeSelected = computed(
  () => store.getters["selection/isNodeSelected"],
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
  if (BENDPOINTS.value.length === 0 || props.absolutePoint) {
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
    ...BENDPOINTS.value,
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
      bendPointDragDelta.value.index === i
        ? {
            x: start.x + bendPointDragDelta.value.x,
            y: start.y + bendPointDragDelta.value.y,
          }
        : start;

    // and we also need to adjust the "end" of the previous path segment
    const endWithDelta: XY =
      bendPointDragDelta.value.index - 1 === i
        ? {
            x: end.x + bendPointDragDelta.value.x,
            y: end.y + bendPointDragDelta.value.y,
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

const addBendpoint = (event: MouseEvent) => {
  const [clickX, clickY] = screenToCanvasCoordinates.value([
    event.clientX,
    event.clientY,
  ]);

  const clickCoords = { x: clickX, y: clickY };

  const foundIndex = pathSegments.value.findIndex((path) => {
    const { start, end } = path;
    return geometry.isPointInRange(start, end, clickCoords);
  });

  if (foundIndex === -1) {
    return;
  }

  // TODO: simulate adding bendpoints
  BENDPOINTS.value = [
    ...BENDPOINTS.value.slice(0, foundIndex),
    clickCoords,
    ...BENDPOINTS.value.slice(foundIndex),
  ];
};

const removeBendpoint = (index: number) => {
  BENDPOINTS.value = [
    ...BENDPOINTS.value.slice(0, index - 1),
    ...BENDPOINTS.value.slice(index),
  ];
};

const onMouseClick = (event: MouseEvent) => {
  if (event.altKey) {
    addBendpoint(event);
    return;
  }

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
  onMouseClick(event);
  store.dispatch("application/toggleContextMenu", { event });
};

const onNodeDragLeave = () => {
  isDraggedOver.value = false;
};

const dragBendPoint = (event: PointerEvent, index: number, position: XY) => {
  if (event.altKey) {
    removeBendpoint(index);
    return;
  }

  isDraggingBendPoint.value = true;
  event.stopPropagation();
  const onMove = ({ clientX, clientY }) => {
    const [moveX, moveY] = screenToCanvasCoordinates.value([clientX, clientY]);

    const deltaX = moveX - position.x;
    const deltaY = moveY - position.y;
    bendPointDragDelta.value = { x: deltaX, y: deltaY, index };
  };

  const onUp = () => {
    // TODO: remove - simulate saving to BE
    BENDPOINTS.value[index - 1] = {
      x: BENDPOINTS.value.at(index - 1).x + bendPointDragDelta.value.x,
      y: BENDPOINTS.value.at(index - 1).y + bendPointDragDelta.value.y,
    };

    bendPointDragDelta.value = { x: 0, y: 0, index: -1 };
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
  };
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
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
        @click.left="onMouseClick"
        @pointerdown.right="onContextMenu"
        @dragenter="onRepositoryNodeDragEnter"
        @dragleave="onNodeDragLeave"
        @drop.stop="onRepositoryNodeDrop"
        @node-dragging-enter="onWorkflowNodeDragEnter"
        @node-dragging-leave.prevent="onNodeDragLeave"
        @node-dragging-end.prevent="onWorkflowNodeDragLeave"
      />
      <circle
        v-if="index !== 0"
        r="4"
        :transform="`translate(${segment.start.x}, ${segment.start.y})`"
        :cx="0"
        @pointerdown="dragBendPoint($event, index, pathSegments[index].start)"
      />
    </template>
  </g>
</template>
