<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed, ref, toRef } from "vue";
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
import { useNodeCustomSizesStore } from "@/store/nodeCustomSizes";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import { useFloatingConnectorStore } from "@/store/floatingConnector/floatingConnector";
import { isFullFloatingConnector } from "@/store/floatingConnector/types";
import { useSelectionStore } from "@/store/selection";
import { useMovingStore } from "@/store/workflow/moving";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import * as $shapes from "@/style/shapes";
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

const customSizesStore = useNodeCustomSizesStore();

// View nodes only show their inline view when fully executed and views are enabled.
// Unexecuted view nodes render compact (same as non-view nodes) to avoid a
// large empty card. Compact nodes are never resized regardless.
const isExecuted = computed(
  () => props.node.state?.executionState === "EXECUTED",
);
// When inline views are disabled, treat all nodes as unexecuted for card sizing
const effectiveIsExecuted = computed(
  () => isExecuted.value && inlineViewsEnabled.value,
);
const customCardHeight = computed<number | undefined>(() => {
  if (!props.node.hasView) return undefined;
  if (!effectiveIsExecuted.value) return $shapes.compactNodeCardHeight;
  return customSizesStore.getSize(props.node.id)?.height ?? undefined;
});
const customCardWidth = computed<number | undefined>(() => {
  if (props.node.hasView && effectiveIsExecuted.value) {
    return customSizesStore.getSize(props.node.id)?.width ?? undefined;
  }
  // Compact nodes (non-view or unexecuted view): variable width based on name
  return $shapes.compactNodeCardWidth(props.name.length);
});

const portPositions = ref<PortPositions>({ in: [], out: [] });

const canvasStore = useWebGLCanvasStore();
const { isDebugModeEnabled, visibleArea, zoomAwareResolution } =
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

const { useEmbeddedDialogs, nodeConfigOpenMode, inlineViewsEnabled } = storeToRefs(useApplicationSettingsStore());
const { dockedRightPanelWidth } = storeToRefs(usePanelStore());
const { hoverSize, renderHoverArea } = useNodeHoverSize({
  isHovering,
  portPositions,
  hasView: computed(() => props.node.hasView),
  dialogType: Node.DialogTypeEnum.Web,
  isUsingEmbeddedDialogs: useEmbeddedDialogs,
  nodeTopOffset: computed(
    () => nodeNameDimensions.value.height + $shapes.webGlNodeActionBarYOffset,
  ),
  allowedActions: props.node.allowedActions,
  isDebugModeEnabled,
  isMetanode,
  cardHeight: customCardHeight,
  cardWidth: customCardWidth,
});

const renderable = computed(
  () =>
    !geometry.isPointOutsideBounds(translatedPosition.value, visibleArea.value),
);

const nodeNamePosition = computed(() => {
  return {
    x: isMetanode.value
      ? $shapes.nodeSize / 2
      : (customCardWidth.value ?? $shapes.nodeCardWidth) / 2,
    // leave space between name and torso for the flowvariable ports
    y: -$shapes.webGlPortSize,
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
  cardHeight: () =>
    customCardHeight.value ??
    (props.node.hasView ? $shapes.nodeCardHeight : $shapes.compactNodeCardHeight),
  cardWidth: () => customCardWidth.value,
});

const actionBarPosition = computed(() => {
  return {
    x: isMetanode.value
      ? $shapes.nodeSize / 2
      : (customCardWidth.value ?? $shapes.nodeCardWidth) / 2,
    y: nodeSelectionMeasures.value.y + $shapes.webGlNodeActionBarYOffset,
  };
});

const isExecuting = computed(
  () =>
    props.node.state?.executionState === "EXECUTING" ||
    props.node.state?.executionState === "QUEUED",
);

const showPorts = computed(
  () => isSelected.value || isDraggingFloatingConnector.value,
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
        :has-view="node.hasView"
        :is-executing="isExecuting"
        :is-replacement-candidate="isReplacementCandidate"
        :is-hovered="isHovering && !isDraggingFloatingConnector"
        :custom-card-height="customCardHeight"
        :custom-card-width="customCardWidth"
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
        :type="type"
        :kind="node.kind"
        :card-width="customCardWidth"
      />
    </Container>

    <NodePorts
      :node-id="node.id"
      :node-kind="node.kind"
      :in-ports="node.inPorts"
      :out-ports="node.outPorts"
      :is-editable="isEditable"
      :ports-visible="showPorts"
      :card-width="customCardWidth"
      :port-groups="
        workflowDomain.node.isNative(node) ? node.portGroups : undefined
      "
      @update-port-positions="portPositions = $event"
    />

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
