<script setup lang="ts">
import { computed, ref, toRefs } from "vue";
import { storeToRefs } from "pinia";
import type { FederatedPointerEvent } from "pixi.js";

import { getMetaOrCtrlKey } from "@knime/utils";

import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useFloatingConnectorStore } from "@/store/floatingConnector/floatingConnector";
import { isPlaceholderPort } from "@/store/floatingConnector/types";
import { useSelectionStore } from "@/store/selection";
import { useMovingStore } from "@/store/workflow/moving";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { useConnectorPathSegments } from "../../SVGKanvas/connectors/useConnectorPathSegments";

import ConnectorPathSegment from "./ConnectorPathSegment.vue";
import type { ConnectorProps } from "./types";
import { useConnectorCulling } from "./useConnectorCulling";

const props = withDefaults(defineProps<ConnectorProps>(), {
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
const { isDebugModeEnabled } = storeToRefs(useWebGLCanvasStore());

const selectionStore = useSelectionStore();
const {
  isNodeSelected,
  isConnectionSelected,
  singleSelectedNode,
  getSelectedConnections: selectedConnections,
} = storeToRefs(selectionStore);

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

const isHovered = ref(false);

const onPathSegmentHovered = (nextState: boolean) => {
  if (floatingConnector.value) {
    return;
  }
  isHovered.value = nextState;
};

const isHighlighted = computed(() => {
  // if only one node and no connections are selected, highlight the connections from and to that node
  return (
    Boolean(singleSelectedNode.value) &&
    selectedConnections.value.length === 0 &&
    (isNodeSelected.value(props.sourceNode ?? "") ||
      isNodeSelected.value(props.destNode ?? ""))
  );
});

const isTargetForReplacement = computed(() => {
  // is the global drag connector itself
  if (!floatingConnector.value || props.absolutePoint) {
    return false;
  }

  // targetting the input port that is already connected
  if (
    snapTarget.value &&
    !isPlaceholderPort(snapTarget.value) &&
    props.destNode === snapTarget.value.parentNodeId &&
    snapTarget.value.index === props.destPort &&
    floatingConnector.value.context.origin === "out"
  ) {
    return true;
  }

  // targetting the output port that is already connected
  if (
    props.destNode === floatingConnector.value.context.parentNodeId &&
    props.destPort === floatingConnector.value.context.portInstance.index &&
    floatingConnector.value.context.origin === "in"
  ) {
    return true;
  }

  return false;
});

const isMultiselectEvent = (event: FederatedPointerEvent) =>
  event.shiftKey || event[getMetaOrCtrlKey()];

const onConnectionClick = (event: FederatedPointerEvent) => {
  if (!isMultiselectEvent(event)) {
    selectionStore.deselectAllObjects();
  }

  const action = isConnectionSelected.value(props.id)
    ? selectionStore.deselectConnection
    : selectionStore.selectConnection;

  action(props.id);
};
</script>

<template>
  <Container :renderable="renderable" :visible="renderable">
    <ConnectorPathSegment
      v-for="(segment, index) of pathSegments"
      :key="index"
      :connection-id="id"
      :segment="segment"
      :index="index"
      :is-flowvariable-connection="Boolean(flowVariableConnection)"
      :is-highlighted="isHighlighted"
      :is-dragged-over="false"
      :is-readonly="!isWorkflowWritable"
      :is-last-segment="index === pathSegments.length - 1"
      :is-selected="isConnectionSelected(id) && !isDragging"
      :interactive="interactive"
      :streaming="streaming"
      :suggest-delete="Boolean(segment.isEnd && isTargetForReplacement)"
      :is-connection-hovered="isHovered"
      :is-debug-mode-enabled="isDebugModeEnabled"
      :is-floating-connector="Boolean(absolutePoint)"
      @pointerdown="onConnectionClick"
      @hovered="onPathSegmentHovered"
    />
  </Container>
</template>
