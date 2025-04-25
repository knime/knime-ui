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
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import { useFloatingConnectorStore } from "@/store/floatingConnector/floatingConnector";
import { isFullFloatingConnector } from "@/store/floatingConnector/types";
import { useSelectionStore } from "@/store/selection";
import { useMovingStore } from "@/store/workflow/moving";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import * as $shapes from "@/style/shapes";
import { geometry } from "@/util/geometry";
import { isNativeNode, isNodeComponent, isNodeMetaNode } from "@/util/nodeUtil";
import type { PortPositions } from "../../common/usePortPositions";
import { useSelectionPreview } from "../SelectionRectangle/useSelectionPreview";
import { useObjectInteractions } from "../common/useObjectInteractions";
import { useZoomAwareResolution } from "../common/useZoomAwareResolution";
import NodePorts from "../ports/NodePorts.vue";
import { markEventAsHandled } from "../util/interaction";

import NodeActionBar from "./NodeActionBar.vue";
import NodeSelectionPlane from "./NodeSelectionPlane.vue";
import NodeDecorators from "./decorators/NodeDecorators.vue";
import NodeLabel from "./nodeLabel/NodeLabel.vue";
import NodeName from "./nodeName/NodeName.vue";
import NodeState from "./nodeState/NodeState.vue";
import NodeTorso from "./torso/NodeTorso.vue";
import { useNodeDoubleClick } from "./useNodeDoubleClick";
import { useNodeHoverSize } from "./useNodeHoverSize";
import { useNodeHoveredStateProvider } from "./useNodeHoveredState";
import { useNodeNameTextMetrics } from "./useNodeNameTextMetrics";
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

const isMetanode = computed(() => isNodeMetaNode(props.node));
const isComponent = computed(() => isNodeComponent(props.node));

const portPositions = ref<PortPositions>({ in: [], out: [] });

const canvasStore = useWebGLCanvasStore();
const { isDebugModeEnabled, visibleArea, toCanvasCoordinates, canvasLayers } =
  storeToRefs(canvasStore);

const canvasAnchoredComponentsStore = useCanvasAnchoredComponentsStore();
const { portTypeMenu } = storeToRefs(canvasAnchoredComponentsStore);
const selectionStore = useSelectionStore();
const { isNodeSelected, getFocusedObject } = storeToRefs(selectionStore);
const { isWritable } = storeToRefs(useWorkflowStore());

const movingStore = useMovingStore();
const { movePreviewDelta, isDragging } = storeToRefs(movingStore);

const translatedPosition = computed(() => {
  if (selectionStore.isNodeSelected(props.node.id)) {
    return {
      x: props.position.x + movePreviewDelta.value.x,
      y: props.position.y + movePreviewDelta.value.y,
    };
  }
  return { x: props.position.x, y: props.position.y };
});

const isEditable = computed(() => {
  if (!isWritable.value) {
    return false;
  }

  return isNodeComponent(props.node) ? !props.node.link : true;
});

const { onNodeLeftDoubleClick } = useNodeDoubleClick({ node: props.node });

const { handlePointerInteraction } = useObjectInteractions({
  isObjectSelected: () => isNodeSelected.value(props.node.id),
  selectObject: () => selectionStore.selectNode(props.node.id),
  deselectObject: () => selectionStore.deselectNode(props.node.id),
  onDoubleClick: onNodeLeftDoubleClick,
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
  () =>
    hoverStateProvider.hoveredNodeId.value === props.node.id ||
    (portTypeMenu.value.isOpen && portTypeMenu.value.nodeId === props.node.id),
);

const { metrics: nodeNameDimensions, shortenedNodeName } =
  useNodeNameTextMetrics({
    nodeName: toRef(props, "name"),
    shortenName: isMetanode.value || isComponent.value,
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
  return {
    x: $shapes.nodeSize / 2,
    // leave space between name and torso for the flowvariable ports
    y: -$shapes.portSize,
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
    floatingConnector.value &&
    isFullFloatingConnector(floatingConnector.value) &&
    floatingConnector.value.context.parentNodeId !== props.node.id,
);

const onNodeHoverAreaPointerEnter = () => {
  hoverStateProvider.onPointerEnter(props.node.id);
};

const onNodeHoverAreaPointerMove = () => {
  if (
    // ignore self-hover
    (floatingConnector.value &&
      isFullFloatingConnector(floatingConnector.value) &&
      floatingConnector.value.context.parentNodeId === props.node.id) ||
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

const { nameEditorNodeId, nameEditorDimensions } = storeToRefs(
  useNodeInteractionsStore(),
);
const isEditingName = computed(() => nameEditorNodeId.value === props.node.id);
const { nodeSelectionMeasures } = useNodeSelectionPlaneMeasures({
  extraHeight: () =>
    isEditingName.value
      ? nameEditorDimensions.value.height
      : nodeNameDimensions.value.height,
  kind: props.node.kind,
  width: () =>
    isEditingName.value
      ? nameEditorDimensions.value.width
      : $shapes.nodeNameHorizontalMargin * 2,
});

const actionBarPosition = computed(() => {
  return {
    x: $shapes.nodeSize / 2,
    y: nodeSelectionMeasures.value.y + $shapes.webGlNodeActionBarYOffset,
  };
});

const onRightClick = (event: PIXI.FederatedPointerEvent) => {
  markEventAsHandled(event, { initiator: "node-ctx-menu" });
  const [x, y] = toCanvasCoordinates.value([event.global.x, event.global.y]);

  canvasStore.setCanvasAnchor({
    isOpen: true,
    anchor: { x, y },
  });

  if (!isNodeSelected.value(props.node.id)) {
    selectionStore.deselectAllObjects();
    selectionStore.selectNode(props.node.id);
  }

  canvasAnchoredComponentsStore.toggleContextMenu();
};

const { resolution } = useZoomAwareResolution();

const nodeLabelPosition = computed(() => {
  const yOffset = 8;
  return {
    x: translatedPosition.value.x + $shapes.nodeSize / 2,
    y:
      translatedPosition.value.y +
      nodeSelectionMeasures.value.y +
      nodeSelectionMeasures.value.height +
      yOffset,
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
    :position="translatedPosition"
    @rightclick="onRightClick"
    @pointerenter="onNodeHoverAreaPointerEnter"
    @pointermove="onNodeHoverAreaPointerMove"
    @pointerleave.self="onNodeHoverAreaPointerLeave"
    @pointerdown="handlePointerInteraction"
  >
    <Graphics
      label="NodeHoverArea"
      :hit-area="nodeHitArea"
      @render="renderHoverArea"
    />

    <NodeActionBar
      v-if="isHovering && !isDragging && !isEditingName"
      v-bind="allAllowedActions"
      :position="actionBarPosition"
      :node-id="node.id"
      :node-kind="node.kind"
      :is-node-selected="isNodeSelected(node.id)"
    />

    <NodeName
      v-if="renderable"
      :node-id="node.id"
      :name="shortenedNodeName"
      :is-editable="isMetanode || isComponent"
      :position="nodeNamePosition"
      :metrics="nodeNameDimensions"
    />

    <Container label="NodeTorsoContainer">
      <NodeTorso
        v-if="renderable"
        label="NodeTorso"
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

      <NodeDecorators v-if="renderable" :type="type" v-bind="node" />

      <NodeState
        v-if="!isMetanode && renderable"
        v-bind="node.state"
        :text-resolution="resolution"
      />
    </Container>

    <NodePorts
      v-if="renderable"
      :node-id="node.id"
      :node-kind="node.kind"
      :in-ports="node.inPorts"
      :out-ports="node.outPorts"
      :is-editable="isEditable"
      :port-groups="isNativeNode(node) ? node.portGroups : undefined"
      @update-port-positions="portPositions = $event"
    />
  </Container>

  <NodeLabel
    v-if="renderable"
    :node-id="node.id"
    :label="node.annotation?.text.value"
    :position="nodeLabelPosition"
  />
</template>
