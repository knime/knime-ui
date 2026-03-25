<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed, ref, toRef, watch } from "vue";
import { storeToRefs } from "pinia";
import * as PIXI from "pixi.js";

import type { KnimeNode } from "@/api/custom-types";
import {
  MetaNodeState,
  NativeNodeInvariants,
  Node,
  type XY,
} from "@/api/gateway-api/generated-api";
import { geometry } from "@/lib/geometry";
import { workflowDomain } from "@/lib/workflow-domain";
import { useApplicationSettingsStore } from "@/store/application/settings";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { usePanelStore } from "@/store/panel";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import { useFloatingConnectorStore } from "@/store/floatingConnector/floatingConnector";
import { isFullFloatingConnector } from "@/store/floatingConnector/types";
import { useSelectionStore } from "@/store/selection";
import { useMovingStore } from "@/store/workflow/moving";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import * as $shapes from "@/style/shapes";
import type { GraphicsInst } from "@/vue3-pixi";
import type { PortPositions } from "../../common/usePortPositions";
import { useNodeHoverProvider } from "../common/useNodeHoverState";
import { useNodeReplacementOrInsertion } from "../common/useNodeReplacementOrInsertion";
import { useObjectInteractions } from "../common/useObjectInteractions";
import NodePorts from "../ports/NodePorts.vue";
import { isMarkedEvent, markPointerEventAsHandled } from "../util/interaction";

import NodeActionBar from "./NodeActionBar.vue";
import NodeDecorators from "./decorators/NodeDecorators.vue";
import NodeLabel from "./nodeLabel/NodeLabel.vue";
import NodeName from "./nodeName/NodeName.vue";
import NodeState from "./nodeState/NodeState.vue";
import NodeTorso from "./torso/NodeTorso.vue";
import { useNodeDoubleClick } from "./useNodeDoubleClick";
import { useNodeHoverSize } from "./useNodeHoverSize";
import { FLOW_VARIABLE_PORT_TYPE_ID, useNodePortPreviewStore } from "./useNodePortPreview";
import { useNodeSelectionPlaneMeasures } from "./useNodeSelectionPlaneMeasures";
import { useNodeNameShortening } from "./useTextShortening";

interface Props {
  node: KnimeNode;
  position: XY;
  name: string;
  icon?: string | null;
  type?: NativeNodeInvariants.TypeEnum | null;
}

const props = withDefaults(defineProps<Props>(), {
  icon: null,
  type: null,
  link: null,
});

const isMetanode = computed(() => workflowDomain.node.isMetaNode(props.node));
const isComponent = computed(() => workflowDomain.node.isComponent(props.node));

const portPositions = ref<PortPositions>({ in: [], out: [] });

const canvasStore = useWebGLCanvasStore();
const { isDebugModeEnabled, visibleArea, zoomAwareResolution, canvasLayers } =
  storeToRefs(canvasStore);

const canvasAnchoredComponentsStore = useCanvasAnchoredComponentsStore();
const { portTypeMenu } = storeToRefs(canvasAnchoredComponentsStore);
const selectionStore = useSelectionStore();
const { isNodeSelected } = selectionStore;
const { isWritable } = storeToRefs(useWorkflowStore());

const movingStore = useMovingStore();
const { isDragging, hasAbortedDrag } = storeToRefs(movingStore);

const isSelected = computed(() => isNodeSelected(props.node.id));

const translatedPosition = computed(() => {
  // cannot return `props.position` directly because a WF patch (e.g undo)
  // won't trigger reactivity
  return { x: props.position.x, y: props.position.y };
});

const isEditable = computed(() => {
  if (!isWritable.value) {
    return false;
  }

  return workflowDomain.node.isComponent(props.node) ? !props.node.link : true;
});

const { onNodeLeftDoubleClick } = useNodeDoubleClick({ node: props.node });

const nodeInteractionsStore = useNodeInteractionsStore();
const { nameEditorNodeId, nameEditorDimensions, replacementOperation } =
  storeToRefs(nodeInteractionsStore);

const isReplacementCandidate = computed(
  () =>
    !hasAbortedDrag.value &&
    replacementOperation.value?.candidateId === props.node.id,
);

const nodeReplacementOrInsertion = useNodeReplacementOrInsertion();

const { singleSelectedNode } = selectionStore.querySelection("preview");

const { handlePointerInteraction, isDraggingThisObject } =
  useObjectInteractions({
    objectMetadata: { type: "node", nodeId: props.node.id },
    onDoubleClick: onNodeLeftDoubleClick,
    onMoveStart: () => {
      if (singleSelectedNode.value) {
        nodeReplacementOrInsertion.onDragStart();
      }
    },
    onMove: (event) => {
      if (singleSelectedNode.value) {
        const [moveX, moveY] = canvasStore.screenToCanvasCoordinates([
          event.clientX,
          event.clientY,
        ]);

        const clickOffset = {
          x: moveX - translatedPosition.value.x,
          y: moveY - translatedPosition.value.y,
        };

        // add to the position of the node an offset based on where the
        // user clicked inside the node body itself, so that replacement
        // is visually hinted on the cursor itself
        nodeReplacementOrInsertion.onDragMove(
          {
            x: translatedPosition.value.x + clickOffset.x,
            y: translatedPosition.value.y + clickOffset.y,
          },
          { type: "from-node-instance", replacementNodeId: props.node.id },
        );
      }
    },
    onMoveEnd: async () => {
      const { wasReplaced } = await nodeReplacementOrInsertion.onDrop(
        translatedPosition.value,
        { type: "from-node-instance", replacementNodeId: props.node.id },
      );

      return { shouldMove: !wasReplaced };
    },
  });

const hoverProvider = useNodeHoverProvider();

const isHovering = computed(
  () =>
    hoverProvider.hoveredNodeId.value === props.node.id ||
    (portTypeMenu.value.isOpen && portTypeMenu.value.nodeId === props.node.id),
);

const { metrics: rawNodeNameDimensions, shortenedText: shortenedNodeName } =
  useNodeNameShortening(toRef(props, "name"));

// For card nodes (non-metanode, non-component) the name is rendered inside
// the card, so the external NodeName is hidden and contributes no height.
const nodeNameDimensions = computed(() => {
  if (!isMetanode.value && !isComponent.value) {
    return { width: 0, height: 0 };
  }
  return rawNodeNameDimensions.value;
});

const { useEmbeddedDialogs, nodeConfigOpenMode } = storeToRefs(useApplicationSettingsStore());
const { dockedRightPanelWidth } = storeToRefs(usePanelStore());
const { hoverSize, renderHoverArea } = useNodeHoverSize({
  isHovering,
  portPositions,
  dialogType: Node.DialogTypeEnum.Web,
  isUsingEmbeddedDialogs: useEmbeddedDialogs,
  nodeTopOffset: computed(
    () => nodeNameDimensions.value.height + $shapes.webGlNodeActionBarYOffset,
  ),
  allowedActions: props.node.allowedActions,
  isDebugModeEnabled,
  isMetanode,
});

const renderable = computed(
  () =>
    !geometry.isPointOutsideBounds(translatedPosition.value, visibleArea.value),
);

const nodeNamePosition = computed(() => {
  return {
    x: isMetanode.value
      ? $shapes.nodeSize / 2
      : $shapes.nodeCardWidth / 2,
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

const onNodeHoverAreaPointerEnter = (event: PIXI.FederatedPointerEvent) => {
  if (isDragging.value || isMarkedEvent(event)) {
    return;
  }

  hoverProvider.onPointerEnter(props.node.id);
};

const onNodeHoverAreaPointerMove = () => {
  if (isDragging.value) {
    return;
  }

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
    candidate: props.node,
    portPositions: portPositions.value,
  });
};

const onNodeHoverAreaPointerLeave = () => {
  if (isDragging.value) {
    return;
  }

  hoverProvider.onPointerLeave();

  floatingConnectorStore.onLeaveConnectionSnapCandidate({
    candidate: props.node,
    portPositions: portPositions.value,
  });
};

const allAllowedActions = computed(() => {
  const loopInfo = workflowDomain.node.isNative(props.node)
    ? props.node.loopInfo
    : undefined;
  const baseConfig = {
    ...props.node.allowedActions,
    ...loopInfo?.allowedActions,
  };

  const canConfigure =
    (nodeConfigOpenMode.value === "actionbar" ||
      nodeConfigOpenMode.value === "modal" ||
      (nodeConfigOpenMode.value === "dock" && !dockedRightPanelWidth.value) ||
      !useEmbeddedDialogs.value) &&
    props.node.dialogType !== undefined;

  return { ...baseConfig, canConfigure };
});

const isEditingName = computed(() => nameEditorNodeId.value === props.node.id);
const { nodeSelectionMeasures } = useNodeSelectionPlaneMeasures({
  extraHeight: () =>
    isEditingName.value
      ? nameEditorDimensions.value.height
      : nodeNameDimensions.value.height,
  isMetanode,
  width: () =>
    isEditingName.value
      ? nameEditorDimensions.value.width
      : $shapes.nodeNameHorizontalMargin * 2,
});

const actionBarPosition = computed(() => {
  return {
    x: isMetanode.value
      ? $shapes.nodeSize / 2
      : $shapes.nodeCardWidth / 2,
    y: nodeSelectionMeasures.value.y + $shapes.webGlNodeActionBarYOffset,
  };
});

const isExecuting = computed(
  () =>
    props.node.state?.executionState === "EXECUTING" ||
    props.node.state?.executionState === "QUEUED",
);

const portPreviewStore = useNodePortPreviewStore();

// Preview for the first data output port — used by the card body (table grid).
const tablePreview = computed(() => {
  const outPorts = "outPorts" in props.node ? props.node.outPorts : [];
  const firstDataPort = outPorts.find((p) => p.typeId !== FLOW_VARIABLE_PORT_TYPE_ID);
  if (!firstDataPort) return null;
  return portPreviewStore.getPreview(props.node.id, firstDataPort.index);
});

// One badge entry per data output port, each positioned at its port's y-coordinate.
const portBadges = computed(() => {
  if (isMetanode.value || isComponent.value) return [];
  const outPorts = "outPorts" in props.node ? props.node.outPorts : [];
  return outPorts
    .map((port, arrayIndex) => {
      if (port.typeId === FLOW_VARIABLE_PORT_TYPE_ID) return null;
      const pos = portPositions.value.out[arrayIndex];
      if (!pos) return null;
      const preview = portPreviewStore.getPreview(props.node.id, port.index);
      if (!preview || preview.imageUrl) return null;
      if (!preview.totalRows && !preview.totalCols) return null;
      return {
        label: `R: ${preview.totalRows.toLocaleString()} | C: ${preview.totalCols.toLocaleString()}`,
        y: pos[1],
      };
    })
    .filter((b): b is NonNullable<typeof b> => b !== null);
});

const badgePaddingX = 1;
const badgeHeight = 9;
const badgeCharWidth = 3.8;
// Left-aligned outside the card, right of the port nub
const badgeX = $shapes.nodeCardWidth + $shapes.portSize + 2;
const badgeLabelStyle = {
  fontFamily: "Roboto Condensed",
  fontSize: 7,
  fontWeight: "bold",
  fill: "#ffffff",
};

const renderBadge = (graphics: GraphicsInst, label: string) => {
  graphics.clear();
  const textW = label.length * badgeCharWidth + badgePaddingX * 2;
  graphics.roundRect(0, -badgeHeight / 2, textW, badgeHeight, 3);
  graphics.fill("#7a7a7a");
};

// Fetch port preview when node finishes executing.
// immediate: true ensures already-executed nodes on load are also fetched.
watch(
  () => props.node.state?.executionState,
  (state, prev) => {
    if (state === "EXECUTING" || state === "QUEUED") {
      portPreviewStore.clearPreview(props.node.id);
    } else if (
      state === "EXECUTED" &&
      prev !== "EXECUTED" &&
      !isMetanode.value
    ) {
      const outPorts = "outPorts" in props.node ? props.node.outPorts : [];
      portPreviewStore.fetchPreview(props.node.id, outPorts);
    }
  },
  { immediate: true },
);

const onRightClick = async (event: PIXI.FederatedPointerEvent) => {
  markPointerEventAsHandled(event, { initiator: "node::onContextMenu" });

  if (!isSelected.value) {
    const { wasAborted } = await selectionStore.tryClearSelection();

    if (wasAborted) {
      return;
    }

    selectionStore.selectNodes([props.node.id]);
  }

  await canvasAnchoredComponentsStore.toggleContextMenu({ event });
};
</script>

<template>
  <Container
    :label="`Node__${node.id}`"
    :renderable="renderable"
    :visible="renderable"
    :event-mode="isDraggingThisObject ? 'none' : 'static'"
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

    <NodeName
      v-if="isMetanode || isComponent"
      :node-id="node.id"
      :name="shortenedNodeName"
      :full-name="name"
      :is-editable="true"
      :position="nodeNamePosition"
      :metrics="rawNodeNameDimensions"
    />

    <Container label="NodeTorsoContainer">
      <NodeTorso
        label="NodeTorso"
        :node-id="node.id"
        :kind="node.kind"
        :type="type"
        :icon="icon"
        :name="name"
        :annotation="node.annotation?.text.value"
        :is-executing="isExecuting"
        :table-preview="tablePreview"
        :is-replacement-candidate="isReplacementCandidate"
        :is-hovered="isHovering && !isDraggingFloatingConnector"
        :execution-state="
          isMetanode
            ? (node.state?.executionState as MetaNodeState.ExecutionStateEnum)
            : undefined
        "
      />

      <NodeDecorators :type="type" v-bind="node" />

      <NodeState
        v-if="!isMetanode"
        v-bind="node.state"
        :text-resolution="zoomAwareResolution"
      />
    </Container>

    <NodePorts
      :node-id="node.id"
      :node-kind="node.kind"
      :in-ports="node.inPorts"
      :out-ports="node.outPorts"
      :is-editable="isEditable"
      :port-groups="
        workflowDomain.node.isNative(node) ? node.portGroups : undefined
      "
      @update-port-positions="portPositions = $event"
    />

    <!-- Dimension badges — one per data output port, left-aligned outside the card -->
    <Container
      v-for="badge in portBadges"
      :key="badge.y"
      label="NodeDimensionBadge"
      event-mode="none"
      :layer="canvasLayers.nodeBadges"
      :x="badgeX"
      :y="badge.y"
    >
      <Graphics
        label="NodeDimensionBadgeBackground"
        event-mode="none"
        @render="renderBadge($event, badge.label)"
      />
      <Text
        label="NodeDimensionBadgeLabel"
        event-mode="none"
        :x="(badge.label.length * badgeCharWidth + badgePaddingX * 2) / 2"
        :y="0"
        :anchor="{ x: 0.5, y: 0.5 }"
        :style="badgeLabelStyle"
        :resolution="zoomAwareResolution"
      >{{ badge.label }}</Text>
    </Container>

    <NodeLabel
      v-if="isMetanode"
      :node-id="node.id"
      :label="node.annotation?.text.value"
      :is-metanode="isMetanode"
      @rightclick="onRightClick"
      @pointerdown="handlePointerInteraction"
    />

    <NodeActionBar
      v-if="isHovering && !isDragging && !isEditingName"
      v-bind="allAllowedActions"
      :position="actionBarPosition"
      :node-id="node.id"
      :node-kind="node.kind"
      :is-node-selected="isNodeSelected(node.id)"
    />
  </Container>
</template>
