<script setup lang="ts">
import { computed, ref, toRefs, watch } from "vue";
import { storeToRefs } from "pinia";
import type { FederatedPointerEvent } from "pixi.js";

import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useFloatingConnectorStore } from "@/store/floatingConnector/floatingConnector";
import {
  isFullFloatingConnector,
  isPlaceholderPort,
} from "@/store/floatingConnector/types";
import { useSelectionStore } from "@/store/selection";
import { useMovingStore } from "@/store/workflow/moving";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { getBendpointId } from "@/util/connectorUtil";
import { useConnectorPathSegments } from "../../common/useConnectorPathSegments";
import type { AbsolutePointXY, ConnectorProps } from "../../types";
import { isMultiselectEvent } from "../../util/isMultiselectEvent";
import { markEventAsHandled } from "../util/interaction";

import ConnectorBendpoint from "./ConnectorBendpoint.vue";
import ConnectorPathSegment from "./ConnectorPathSegment.vue";
import { useBendpointActions } from "./useBendpointActions";
import { useConnectorCulling } from "./useConnectorCulling";

const props = withDefaults(defineProps<ConnectorProps<AbsolutePointXY>>(), {
  sourceNode: null,
  sourcePort: null,
  destNode: null,
  destPort: null,
  absolutePoint: null,
  interactive: true,
  bendpoints: () => [],
});

const { isDragging } = storeToRefs(useMovingStore());
const { isWritable: isWorkflowWritable } = storeToRefs(useWorkflowStore());
const canvasStore = useWebGLCanvasStore();
const { isDebugModeEnabled } = storeToRefs(canvasStore);

const selectionStore = useSelectionStore();
const { singleSelectedNode, getSelectedConnections: selectedConnections } =
  storeToRefs(selectionStore);
const { isNodeSelected, isConnectionSelected, isBendpointSelected } =
  selectionStore;

const { floatingConnector, snapTarget } = storeToRefs(
  useFloatingConnectorStore(),
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
  absolutePoint: computed(() =>
    props.absolutePoint ? [props.absolutePoint.x, props.absolutePoint.y] : null,
  ),
  bendpoints,
});

const { renderable } = useConnectorCulling({
  sourceNode,
  destNode,
  sourcePort,
  destPort,
  absolutePoint: computed(() =>
    absolutePoint.value ? [absolutePoint.value.x, absolutePoint.value.y] : null,
  ),
});
const { shouldHideSelection } = storeToRefs(useSelectionStore());
const isConnectionHovered = ref(false);
const hoveredPathSegment = ref<number>();

const onPathSegmentHovered = (
  nextState: boolean,
  index: number | undefined,
) => {
  if (floatingConnector.value || isDragging.value) {
    return;
  }

  isConnectionHovered.value = nextState;
  hoveredPathSegment.value = index;
};

const isHighlighted = computed(() => {
  // if only one node and no connections are selected, highlight the connections from and to that node
  return (
    Boolean(singleSelectedNode.value) &&
    !shouldHideSelection.value &&
    selectedConnections.value.length === 0 &&
    (isNodeSelected(props.sourceNode ?? "") ||
      isNodeSelected(props.destNode ?? ""))
  );
});

const isTargetForReplacement = computed(() => {
  // is the global drag connector itself
  if (!floatingConnector.value || props.absolutePoint) {
    return false;
  }

  // targeting the input port that is already connected
  if (
    snapTarget.value &&
    !isPlaceholderPort(snapTarget.value) &&
    props.destNode === snapTarget.value.parentNodeId &&
    snapTarget.value.index === props.destPort &&
    floatingConnector.value.context.origin === "out"
  ) {
    return true;
  }

  // targeting the output port that is already connected
  if (
    isFullFloatingConnector(floatingConnector.value) &&
    props.destNode === floatingConnector.value.context.parentNodeId &&
    props.destPort === floatingConnector.value.context.portInstance.index &&
    floatingConnector.value.context.origin === "in"
  ) {
    return true;
  }

  return false;
});

const onConnectionPointerdown = async (event: FederatedPointerEvent) => {
  markEventAsHandled(event, { initiator: "connection-select" });
  if (!isMultiselectEvent(event)) {
    await selectionStore.deselectAllObjects();
  }

  const action = isConnectionSelected(props.id)
    ? selectionStore.deselectConnections
    : selectionStore.selectConnections;

  action(props.id);
};

const {
  hoveredBendpoint,
  isBendpointVisible,
  onBendpointClick,
  onBendpointRightClick,
  setHoveredBendpoint,
  onVirtualBendpointClick,
} = useBendpointActions({
  connectionId: props.id,
  isConnectionHighlighted: isHighlighted,
  isConnectionHovered,
});

const sourceAndDestinationSelected = computed(() => {
  return (
    isNodeSelected(sourceNode.value ?? "") &&
    isNodeSelected(destNode.value ?? "")
  );
});

watch(sourceAndDestinationSelected, (value) => {
  if (value) {
    const bendpoints = Array(pathSegments.value.length - 1)
      .fill(null)
      .map((_, i) => getBendpointId(props.id, i));

    if (bendpoints.every((id) => !isBendpointSelected(id))) {
      selectionStore.selectBendpoints(bendpoints);
    }
  }
});
</script>

<template>
  <Container
    :label="`Connection__${id}`"
    :renderable="renderable"
    :visible="renderable"
  >
    <template v-for="(segment, index) of pathSegments" :key="index">
      <ConnectorPathSegment
        :connection-id="id"
        :segment="segment"
        :index="index"
        :is-flowvariable-connection="Boolean(flowVariableConnection)"
        :is-highlighted="isHighlighted"
        :is-dragged-over="false"
        :is-readonly="!isWorkflowWritable"
        :is-last-segment="index === pathSegments.length - 1"
        :is-selected="
          isConnectionSelected(id) && !isDragging && !shouldHideSelection
        "
        :interactive="interactive"
        :streaming="streaming"
        :suggest-delete="Boolean(segment.isEnd && isTargetForReplacement)"
        :is-connection-hovered="isConnectionHovered"
        :is-segment-hovered="hoveredPathSegment === index"
        :is-debug-mode-enabled="isDebugModeEnabled"
        :is-floating-connector="Boolean(absolutePoint)"
        @pointerdown.stop="onConnectionPointerdown"
        @pointerenter="onPathSegmentHovered(true, index)"
        @pointerleave="onPathSegmentHovered(false, undefined)"
        @hover-virtual-bendpoint="
          (hovered) =>
            onPathSegmentHovered(hovered, hovered ? index : undefined)
        "
        @add-virtual-bendpoint="onVirtualBendpointClick({ ...$event, index })"
      />

      <ConnectorBendpoint
        v-if="index !== 0"
        :is-selected="
          isBendpointSelected(getBendpointId(id, index - 1)) &&
          !shouldHideSelection
        "
        :is-dragging="isDragging"
        :is-flow-variable-connection="Boolean(flowVariableConnection)"
        :position="pathSegments[index].start"
        :index="index - 1"
        :connection-id="id"
        :interactive="interactive && isWorkflowWritable"
        :is-visible="isBendpointVisible || hoveredBendpoint === index - 1"
        :is-debug-mode-enabled="isDebugModeEnabled"
        @pointerdown.stop="onBendpointClick($event, index)"
        @pointerenter="setHoveredBendpoint(true, index - 1)"
        @pointerleave="setHoveredBendpoint(false, index - 1)"
        @rightclick="onBendpointRightClick($event, index - 1)"
      />
    </template>
  </Container>
</template>
