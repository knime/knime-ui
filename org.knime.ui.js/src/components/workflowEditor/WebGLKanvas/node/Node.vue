<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed, ref, toRef, unref } from "vue";
import { storeToRefs } from "pinia";
import * as PIXI from "pixi.js";

import type { KnimeNode } from "@/api/custom-types";
import {
  MetaNodeState,
  NativeNodeInvariants,
  Node,
} from "@/api/gateway-api/generated-api";
import { useApplicationSettingsStore } from "@/store/application/settings";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useFloatingConnectorStore } from "@/store/floatingConnector/floatingConnector";
import { useSelectionStore } from "@/store/selection";
import { useMovingStore } from "@/store/workflow/moving";
import { useWorkflowStore } from "@/store/workflow/workflow";
import * as $shapes from "@/style/shapes";
import { geometry } from "@/util/geometry";
import { isNativeNode, isNodeComponent, isNodeMetaNode } from "@/util/nodeUtil";
import type { PortPositions } from "../../common/usePortPositions";
import { useSelectionPreview } from "../SelectionRectangle/useSelectionPreview";
import NodePorts from "../ports/NodePorts.vue";
import { nodeNameText } from "../util/textStyles";

import NodeActionBar from "./NodeActionBar.vue";
import NodeSelectionPlane from "./NodeSelectionPlane.vue";
import NodeState from "./nodeState/NodeState.vue";
import NodeTorso from "./torso/NodeTorso.vue";
import { useNodeDragging } from "./useNodeDragging";
import { useNodeHoverSize } from "./useNodeHoverSize";
import { useNodeHoveredStateProvider } from "./useNodeHoveredState";
import { useNodeSelectionPlaneMeasures } from "./useNodeSelectionPlaneMeasures";

interface Props {
  node: KnimeNode;
  position: { x: number; y: number };
  name: string;
  icon?: string | null;
  type?: NativeNodeInvariants.TypeEnum | null;
}

const props = withDefaults(defineProps<Props>(), {
  icon: null,
  type: null,
  link: null,
});

const emit = defineEmits<{
  contextmenu: [event: PIXI.FederatedPointerEvent];
}>();

const { isDebugModeEnabled, visibleArea, canvasLayers } = storeToRefs(
  useWebGLCanvasStore(),
);

const portPositions = ref<PortPositions>({ in: [], out: [] });

const selectionStore = useSelectionStore();
const { isNodeSelected, getFocusedObject } = storeToRefs(selectionStore);
const { isWritable } = storeToRefs(useWorkflowStore());

const movingStore = useMovingStore();
const { movePreviewDelta, isDragging } = storeToRefs(movingStore);

const positionWithDelta = computed(() => ({
  x: props.position.x + movePreviewDelta.value.x,
  y: props.position.y + movePreviewDelta.value.y,
}));

const translatedPosition = computed(() => {
  return isNodeSelected.value(props.node.id)
    ? positionWithDelta.value
    : props.position;
});

const isEditable = computed(() => {
  if (!isWritable.value) {
    return false;
  }

  return isNodeComponent(props.node) ? !props.node.link : true;
});

const { startDrag } = useNodeDragging({
  nodeId: props.node.id,
  position: toRef(props, "position"),
});

const { isSelectionPreviewShown } = useSelectionPreview({
  objectId: props.node.id,
  eventNameResolver: () => `node-selection-preview-${props.node.id}`,
  isObjectSelected: unref(isNodeSelected),
});

const isSelectionFocusShown = computed(
  () => getFocusedObject.value?.id === props.node.id,
);

const hoverStateProvider = useNodeHoveredStateProvider();

const isHovering = computed(
  () => hoverStateProvider.hoveredNodeId.value === props.node.id,
);

// this is not reactive!
const style = new PIXI.TextStyle(nodeNameText.styles);
const nameMeasures = PIXI.CanvasTextMetrics.measureText(
  props.name,
  style,
  undefined,
  true,
);

const SINGLE_LINE_TEXT_HEIGHT_THRESHOLD = 40;
const textYAnchor = computed(() =>
  // eslint-disable-next-line no-magic-numbers
  nameMeasures.height <= SINGLE_LINE_TEXT_HEIGHT_THRESHOLD ? 0 : 0.5,
);

const nodeNameDimensions = ref({
  width: nameMeasures.width * nodeNameText.downscalingFactor,
  height: nameMeasures.height * nodeNameText.downscalingFactor,
});

const { useEmbeddedDialogs } = storeToRefs(useApplicationSettingsStore());
const { hoverSize, renderHoverArea } = useNodeHoverSize({
  isHovering,
  portPositions,
  dialogType: Node.DialogTypeEnum.Web,
  isUsingEmbeddedDialogs: useEmbeddedDialogs,
  nodeTopOffset: computed(
    () => nodeNameDimensions.value.height + $shapes.webGlNodeActionBarYOffset,
  ),
  allowedActions: props.node.allowedActions!,
  isDebugModeEnabled,
});

const renderable = computed(
  () =>
    !geometry.utils.isPointOutsideBounds(
      translatedPosition.value,
      visibleArea.value,
    ),
);

const nodeNamePosition = computed(() => {
  const { x, y } = translatedPosition.value;
  return {
    x: x + hoverSize.value.x + hoverSize.value.width / 2,
    y: y - $shapes.nodeSize / 2 - $shapes.nodeNameMargin,
  };
});

const nodeHitArea = computed(
  () =>
    new PIXI.Rectangle(
      hoverSize.value.x,
      hoverSize.value.y,
      hoverSize.value.width,
      hoverSize.value.height,
    ),
);

const isMetanode = computed(() => isNodeMetaNode(props.node));

const floatingConnectorStore = useFloatingConnectorStore();
const {
  activeConnectionValidTargets,
  floatingConnector,
  isDragging: isDraggingFloatingConnector,
} = storeToRefs(floatingConnectorStore);
const isConnectionForbidden = computed(
  () =>
    activeConnectionValidTargets.value &&
    !activeConnectionValidTargets.value.has(props.node.id) &&
    floatingConnector.value?.context.parentNodeId !== props.node.id,
);

const onNodeHoverAreaPointerEnter = () => {
  hoverStateProvider.onPointerEnter(props.node.id);
};

const onNodeHoverAreaPointerMove = () => {
  if (
    // ignore self-hover
    floatingConnector.value?.context.parentNodeId === props.node.id ||
    !isDraggingFloatingConnector.value ||
    isConnectionForbidden.value
  ) {
    return;
  }

  floatingConnectorStore.onMoveOverConnectionSnapCandidate({
    referenceNode: props.node,
    parentNodePortPositions: portPositions.value,
  });
};

const onNodeHoverAreaPointerLeave = () => {
  hoverStateProvider.onPointerLeave();

  floatingConnectorStore.onLeaveConnectionSnapCandidate({
    referenceNode: props.node,
    parentNodePortPositions: portPositions.value,
  });
};

const allAllowedActions = computed(() => {
  const loopInfo = isNativeNode(props.node) ? props.node.loopInfo : undefined;
  const baseConfig = {
    ...props.node.allowedActions,
    ...loopInfo?.allowedActions,
  };

  let canConfigure = false;

  if (props.node.dialogType) {
    canConfigure = useEmbeddedDialogs.value
      ? props.node.dialogType === Node.DialogTypeEnum.Swing
      : true;
  }

  return { ...baseConfig, canConfigure };
});

const { nodeSelectionMeasures } = useNodeSelectionPlaneMeasures({
  extraHeight: nodeNameDimensions.value.height,
  kind: props.node.kind,
  width: nodeNameDimensions.value.width + $shapes.nodeNameHorizontalMargin * 2,
});

const actionBarPosition = computed(() => {
  return {
    x: translatedPosition.value.x + $shapes.nodeSize / 2,
    // eslint-disable-next-line no-magic-numbers
    y:
      translatedPosition.value.y +
      nodeSelectionMeasures.value.y +
      $shapes.webGlNodeActionBarYOffset,
  };
});
</script>

<template>
  <NodeSelectionPlane
    :layer="canvasLayers.background"
    :anchor-position="translatedPosition"
    :renderable="renderable"
    :show-selection="isSelectionPreviewShown"
    :show-focus="isSelectionFocusShown"
    :measures="nodeSelectionMeasures"
  />

  <Container
    :label="`Node__${node.id}`"
    :renderable="renderable"
    :visible="renderable"
    :layer="isNodeSelected(node.id) ? canvasLayers.selectedNodes : null"
    event-mode="static"
    :alpha="floatingConnector && isConnectionForbidden ? 0.7 : 1"
    @rightclick="emit('contextmenu', $event)"
    @pointerenter="onNodeHoverAreaPointerEnter"
    @pointermove="onNodeHoverAreaPointerMove"
    @pointerleave.self="onNodeHoverAreaPointerLeave"
    @pointerdown="startDrag"
  >
    <Graphics
      label="NodeHoverArea"
      :hit-area="nodeHitArea"
      :position="translatedPosition"
      @render="renderHoverArea"
    />

    <NodeActionBar
      v-if="isHovering && !isDragging"
      v-bind="allAllowedActions"
      :position="actionBarPosition"
      :node-id="node.id"
      :node-kind="node.kind"
      :is-node-selected="isNodeSelected(node.id)"
    />

    <Text
      label="NodeName"
      :position="nodeNamePosition"
      :resolution="1.2"
      :scale="nodeNameText.downscalingFactor"
      :style="nodeNameText.styles"
      :anchor="{ x: 0.5, y: textYAnchor }"
      :round-pixels="true"
    >
      {{ name }}
    </Text>

    <Container label="NodeTorsoContainer" :position="translatedPosition">
      <NodeTorso
        v-if="renderable"
        :node-id="node.id"
        :kind="node.kind"
        :type="type"
        :icon="icon"
        :is-hovered="isHovering && !isDraggingFloatingConnector"
        :execution-state="
          isMetanode
            ? (node.state?.executionState as MetaNodeState.ExecutionStateEnum)
            : undefined
        "
      />

      <NodeState v-if="!isMetanode && renderable" v-bind="node.state" />
    </Container>

    <NodePorts
      v-if="renderable"
      :node-id="node.id"
      :node-kind="node.kind"
      :anchor="translatedPosition"
      :in-ports="node.inPorts"
      :out-ports="node.outPorts"
      :is-editable="isEditable"
      :port-groups="null"
      @update-port-positions="portPositions = $event"
    />
  </Container>
</template>
