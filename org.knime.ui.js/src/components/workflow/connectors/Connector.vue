<script setup lang="ts">
import { ref, computed, toRefs, watch } from "vue";

import { navigatorUtils } from "@knime/utils";
import type { XY } from "@/api/gateway-api/generated-api";
import { getBendpointId } from "@/util/connectorUtil";
import { useStore } from "@/composables/useStore";
import { useMoveObject } from "@/composables/useMoveObject";

import { useConnectionReplacement } from "./useConnectionReplacement";
import ConnectorPathSegment from "./ConnectorPathSegment.vue";
import ConnectorBendpoint from "./ConnectorBendpoint.vue";
import { useConnectorPathSegments } from "./useConnectorPathSegments";
import type { ConnectorProps } from "./types";

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<ConnectorProps>(), {
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

const isNodeSelected = computed(
  () => store.getters["selection/isNodeSelected"],
);
const isConnectionSelected = computed(
  () => store.getters["selection/isConnectionSelected"],
);
const isBendpointSelected = computed(
  () => store.getters["selection/isBendpointSelected"],
);

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

const isWorkflowWritable = computed(() => store.getters["workflow/isWritable"]);

const sourceAndDestinationSelected = computed(() => {
  return (
    isNodeSelected.value(sourceNode.value) &&
    isNodeSelected.value(destNode.value)
  );
});

watch(sourceAndDestinationSelected, (value) => {
  if (value) {
    const bendpoints = Array(pathSegments.value.length - 1)
      .fill(null)
      .map((_, i) => getBendpointId(props.id, i));

    if (bendpoints.every((id) => !isBendpointSelected.value(id))) {
      store.dispatch("selection/selectBendpoints", bendpoints);
    }
  }
});

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

const isMultiselect = (event: MouseEvent | PointerEvent) =>
  event.shiftKey || event[navigatorUtils.getMetaOrCtrlKey()];

const onConnectionSegmentClick = (event: MouseEvent) => {
  if (!isMultiselect(event)) {
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

const virtualBendpoint = ref<{ index: number; position: XY } | null>(null);
const itemRefs = ref<{ $el: HTMLElement }[]>([]);

const onVirtualBendpointAdded = async ({
  position,
  index,
  event,
}: {
  position: XY;
  index: number;
  event: PointerEvent;
}) => {
  await store.dispatch("workflow/addVirtualBendpoint", {
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

  itemRefs.value[index].$el.dispatchEvent(ptrEvent);
};

const { createPointerDownHandler } = useMoveObject({
  useGridSnapping: false,
  onMoveEndCallback: () => {
    if (virtualBendpoint.value) {
      store.dispatch("workflow/addBendpoint", {
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

const onBendpointPointerdown = (
  event: PointerEvent,
  index: number,
  position: XY,
) => {
  if (isMultiselect(event)) {
    return;
  }

  const bendpointId = getBendpointId(props.id, index - 1);
  if (
    !isBendpointSelected.value(bendpointId, props.sourceNode, props.destNode)
  ) {
    store.dispatch("selection/deselectAllObjects");
  }
  store.dispatch("selection/selectBendpoint", bendpointId);

  const handler = createPointerDownHandler(computed(() => position));
  handler(event);
};

const onBendpointClick = (event: MouseEvent, index: number) => {
  if (isDragging.value) {
    return;
  }

  const bendpointId = getBendpointId(props.id, index - 1);

  if (isMultiselect(event)) {
    const action = isBendpointSelected.value(
      bendpointId,
      props.sourceNode,
      props.destNode,
    )
      ? "deselect"
      : "select";
    store.dispatch(`selection/${action}Bendpoint`, bendpointId);
  } else {
    store.dispatch("selection/deselectAllObjects");
    store.dispatch("selection/selectBendpoint", bendpointId);
  }
};

const hoveredBendpoint = ref<number | null>(null);

const isBendpointVisible = computed(() => {
  return (
    isConnectionSelected.value(props.id) ||
    isHighlighted.value ||
    isHovered.value
  );
});

const setHoveredBendpoint = (isHovered: boolean, index: number) => {
  hoveredBendpoint.value = isHovered ? index : null;
};

const onBendpointRightClick = (event: PointerEvent, index: number) => {
  const bendpointId = getBendpointId(props.id, index - 1);

  hoveredBendpoint.value = index - 1;
  store.dispatch("selection/selectBendpoint", bendpointId);
  store.dispatch("application/toggleContextMenu", { event });
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
        :is-selected="
          isBendpointSelected(
            getBendpointId(id, index - 1),
            sourceNode,
            destNode,
          )
        "
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
