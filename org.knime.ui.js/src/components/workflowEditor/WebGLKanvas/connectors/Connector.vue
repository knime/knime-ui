<script setup lang="ts">
import { computed, ref, toRefs } from "vue";
import { storeToRefs } from "pinia";
import type { FederatedPointerEvent } from "pixi.js";

import { useCanvasModesStore } from "@/store/application/canvasModes";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import { useFloatingConnectorStore } from "@/store/floatingConnector/floatingConnector";
import {
  isFullFloatingConnector,
  isPlaceholderPort,
} from "@/store/floatingConnector/types";
import { useSelectionStore } from "@/store/selection";
import { useMovingStore } from "@/store/workflow/moving";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { getBendpointId } from "@/util/connectorUtil";
import { useConnectorPathSegments } from "../../common/useConnectorPathSegments";
import type { AbsolutePointXY, ConnectorProps } from "../../types";
import { isMultiselectEvent } from "../../util/isMultiselectEvent";
import { markPointerEventAsHandled } from "../util/interaction";

import ConnectorBendpoint from "./ConnectorBendpoint.vue";
import ConnectorPathSegment from "./ConnectorPathSegment.vue";
import { useBendpointActions } from "./useBendpointActions";

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
const { isDebugModeEnabled, isHoldingDownSpace } = storeToRefs(canvasStore);

const selectionStore = useSelectionStore();
const { getSelectedConnections: selectedConnections } =
  storeToRefs(selectionStore);
const { isNodeSelected, isConnectionSelected, isBendpointSelected } =
  selectionStore;

const {
  floatingConnector,
  snapTarget,
  isDragging: isDraggingFloatingConnector,
} = storeToRefs(useFloatingConnectorStore());

const { replacementOperation } = storeToRefs(useNodeInteractionsStore());

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

const isSourceNodeSelected = computed(() =>
  isNodeSelected(props.sourceNode ?? ""),
);
const isDestNodeSelected = computed(() => isNodeSelected(props.destNode ?? ""));
const { singleSelectedNode } = selectionStore.querySelection("committed");

const isHighlighted = computed(() => {
  if (!singleSelectedNode.value) {
    return false;
  }

  // if only one node and no connections are selected, highlight the connections from and to that node
  return (
    !shouldHideSelection.value &&
    selectedConnections.value.length === 0 &&
    (isSourceNodeSelected.value || isDestNodeSelected.value)
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
  if (useCanvasModesStore().hasPanModeEnabled) {
    return;
  }

  const isMouseLeftClick = event.button === 0;
  if ((isMouseLeftClick && isHoldingDownSpace.value) || !isMouseLeftClick) {
    return;
  }

  markPointerEventAsHandled(event, { initiator: "connection-select" });
  if (!isMultiselectEvent(event)) {
    const { wasAborted } = await selectionStore.tryClearSelection();
    if (wasAborted) {
      return;
    }
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

const onRightClick = async (event: FederatedPointerEvent) => {
  markPointerEventAsHandled(event, { initiator: "connection::onContextMenu" });

  if (!isConnectionSelected(props.id)) {
    selectionStore.deselectAllObjects();
  }

  selectionStore.selectConnections(props.id);
  await useCanvasAnchoredComponentsStore().toggleContextMenu({ event });
};
</script>

<template>
  <Container :label="`Connection__${id}`">
    <template v-for="(segment, index) of pathSegments" :key="index">
      <ConnectorPathSegment
        :connection-id="id"
        :segment="segment"
        :index="index"
        :is-flowvariable-connection="Boolean(flowVariableConnection)"
        :is-highlighted="isHighlighted"
        :is-dragged-over="replacementOperation?.candidateId === id"
        :is-readonly="!isWorkflowWritable"
        :is-last-segment="index === pathSegments.length - 1"
        :is-selected="
          isConnectionSelected(id) && !isDragging && !shouldHideSelection
        "
        :interactive="interactive && !isDraggingFloatingConnector"
        :streaming="streaming"
        :suggest-delete="Boolean(segment.isEnd && isTargetForReplacement)"
        :is-connection-hovered="isConnectionHovered"
        :is-segment-hovered="hoveredPathSegment === index"
        :is-debug-mode-enabled="isDebugModeEnabled"
        :is-floating-connector="Boolean(absolutePoint)"
        @pointerdown="onConnectionPointerdown"
        @pointerenter="onPathSegmentHovered(true, index)"
        @pointerleave="onPathSegmentHovered(false, undefined)"
        @hover-virtual-bendpoint="
          (hovered) =>
            onPathSegmentHovered(hovered, hovered ? index : undefined)
        "
        @rightclick="onRightClick"
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
