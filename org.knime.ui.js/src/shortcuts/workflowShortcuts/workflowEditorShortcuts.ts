import { API } from "@api";

import type { KnimeNode, NodeRelation } from "@/api/custom-types";
import type { XY } from "@/api/gateway-api/generated-api";
import type { QuickActionMenuMode } from "@/components/workflowEditor/CanvasAnchoredComponents/QuickActionMenu/QuickActionMenu.vue";
import { useCurrentCanvasStore } from "@/store/canvas/useCurrentCanvasStore";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import { useSelectionStore } from "@/store/selection";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { nodeSize } from "@/style/shapes";
import { geometry } from "@/util/geometry";
import { isNodeMetaNode } from "@/util/nodeUtil";
import { portPositions } from "@/util/portShift";
import type { ShortcutExecuteContext, UnionToShortcutRegistry } from "../types";

type WorkflowEditorShortcuts = UnionToShortcutRegistry<
  | "openQuickNodeInsertionMenu"
  | "openQuickBuildMenu"
  | "autoConnectNodesDefault"
  | "autoConnectNodesFlowVar"
  | "autoDisconnectNodesDefault"
  | "autoDisconnectNodesFlowVar"
>;

const createAutoConnectionHandler =
  (
    command:
      | typeof API.workflowCommand.AutoConnect
      | typeof API.workflowCommand.AutoDisconnect,
    flowVariablePortsOnly: boolean = false,
  ) =>
  () => {
    const { projectId, workflowId } =
      useWorkflowStore().getProjectAndWorkflowIds;

    const { selectedNodeIds, getSelectedMetanodePortBars: selectedPortBars } =
      useSelectionStore();

    command({
      projectId,
      workflowId,
      selectedNodes: selectedNodeIds,
      workflowInPortsBarSelected: selectedPortBars.includes("in"),
      workflowOutPortsBarSelected: selectedPortBars.includes("out"),
      flowVariablePortsOnly,
    });
  };

const canAutoConnectOrDisconnect = () => {
  const {
    getSelectedNodes: selectedNodes,
    getSelectedMetanodePortBars: selectedPortBars,
  } = useSelectionStore();

  const isSingleNodeSelected = selectedNodes.length === 1;
  const isAnyPortBarSelected = selectedPortBars.length !== 0;
  const isMultipleNodesSelected = selectedNodes.length > 1;

  return isSingleNodeSelected ? isAnyPortBarSelected : isMultipleNodesSelected;
};

const calculateNodeInsertionPosition = (
  node: KnimeNode,
  portIndex: number,
  portCount: number,
  nextSide: NodeRelation,
) => {
  const isOutports = nextSide === "SUCCESSORS";
  const portPositionValues = portPositions({
    portCount,
    isMetanode: isNodeMetaNode(node),
    isOutports,
  });
  const xOffset = nodeSize * (isOutports ? 3 : -3);
  const startPoint: XY = {
    x: node.position.x + portPositionValues[portIndex][0] + xOffset,
    y: node.position.y + portPositionValues[portIndex][1],
  };
  return geometry.findFreeSpaceAroundPointWithFallback({
    startPoint,
    visibleFrame: useCurrentCanvasStore().value.getVisibleFrame,
    nodes: useWorkflowStore().activeWorkflow!.nodes,
  });
};

const openQuickActionMenu =
  ({ menuMode }: { menuMode: QuickActionMenuMode }) =>
  ({ payload }: ShortcutExecuteContext) => {
    const positionFromContextMenu = payload?.metadata?.position as XY;
    const store = useCanvasAnchoredComponentsStore();
    const { isOpen, props: currentMenuProps } = store.quickActionMenu;

    // get current quick action menu info (if exists)
    const {
      nodeId: lastNodeId,
      port,
      position: lastPosition,
      nodeRelation,
      positionOrigin: lastPositionOrigin,
    } = currentMenuProps ?? {};
    const lastPortIndex = port?.index ?? -1;

    const predecessorNode = isOpen
      ? useNodeInteractionsStore().getNodeById(lastNodeId!)
      : useSelectionStore().singleSelectedNode;

    // 1. no single predecessor node, open quick action menu as detached
    if (predecessorNode === null) {
      const position =
        positionFromContextMenu ??
        geometry.findFreeSpaceAroundCenterWithFallback({
          visibleFrame: useCurrentCanvasStore().value.getVisibleFrame,
          nodes: useWorkflowStore().activeWorkflow!.nodes,
        });

      store.openQuickActionMenu({
        props: {
          position,
          initialMode: menuMode,
        },
      });
      return;
    }

    // determine where and how to render quick action menu
    let nextSide = nodeRelation || "SUCCESSORS";
    if (lastPortIndex === 0) {
      nextSide = nodeRelation === "SUCCESSORS" ? "PREDECESSORS" : "SUCCESSORS";
    }
    const portCount =
      nextSide === "SUCCESSORS"
        ? predecessorNode.outPorts.length
        : predecessorNode.inPorts.length;
    const startIndex = portCount === 1 ? 0 : 1;
    const nextIndex =
      nextSide === nodeRelation ? (lastPortIndex + 1) % portCount : startIndex;
    const portIndex =
      lastNodeId === predecessorNode.id ? nextIndex : startIndex;

    const nextPort =
      nextSide === "SUCCESSORS"
        ? predecessorNode.outPorts[portIndex]
        : predecessorNode.inPorts[portIndex];

    const portSideWillChange = nextSide !== nodeRelation;
    const portSideChangesForCalculatedPosition =
      portSideWillChange && lastPositionOrigin !== "mouse";
    const useLastPosition = isOpen && !portSideChangesForCalculatedPosition;
    const position =
      useLastPosition && lastPosition
        ? lastPosition
        : calculateNodeInsertionPosition(
            predecessorNode,
            portIndex,
            portCount,
            nextSide,
          );

    // 2. predecessor node(s) exist, render quick action menu attached on the correct side
    store.openQuickActionMenu({
      props: {
        nodeId: predecessorNode.id,
        port: nextPort,
        position,
        nodeRelation: nextSide,
        positionOrigin: useLastPosition ? lastPositionOrigin : "calculated",
        initialMode: menuMode,
      },
    });
  };

const workflowEditorShortcuts: WorkflowEditorShortcuts = {
  openQuickNodeInsertionMenu: {
    text: "Quick add node",
    title: "Quick add node",
    hotkey: ["CtrlOrCmd", "."],
    additionalHotkeys: [{ key: ["Ctrl", " " /* Space */], visible: false }],
    group: "workflowEditor",
    execute: openQuickActionMenu({ menuMode: "quick-add" }),
    condition: () => useWorkflowStore().isWritable,
  },
  openQuickBuildMenu: {
    text: "Quick Build with K-AI",
    title: "Quick Build with K-AI",
    hotkey: ["CtrlOrCmd", "Shift", "."],
    additionalHotkeys: [
      { key: ["Ctrl", "Shift", " " /* Space */], visible: false },
    ],
    group: "workflowEditor",
    execute: openQuickActionMenu({ menuMode: "quick-build" }),
    condition: () => useWorkflowStore().isWritable,
  },
  autoConnectNodesDefault: {
    text: "Connect nodes",
    title: "Connect nodes",
    hotkey: ["CtrlOrCmd", "L"],
    group: "workflowEditor",
    execute: createAutoConnectionHandler(API.workflowCommand.AutoConnect),
    condition: canAutoConnectOrDisconnect,
  },
  autoConnectNodesFlowVar: {
    text: "Connect nodes by flow variable port",
    title: "Connect nodes by flow variable port",
    hotkey: ["CtrlOrCmd", "K"],
    group: "workflowEditor",
    execute: createAutoConnectionHandler(API.workflowCommand.AutoConnect, true),
    condition: canAutoConnectOrDisconnect,
  },
  autoDisconnectNodesDefault: {
    text: "Disconnect nodes",
    title: "Disconnect nodes",
    hotkey: ["CtrlOrCmd", "Shift", "L"],
    group: "workflowEditor",
    execute: createAutoConnectionHandler(API.workflowCommand.AutoDisconnect),
    condition: canAutoConnectOrDisconnect,
  },
  autoDisconnectNodesFlowVar: {
    text: "Disconnect nodes' flow variable ports",
    title: "Disconnect nodes' flow variable ports",
    hotkey: ["CtrlOrCmd", "Shift", "K"],
    group: "workflowEditor",
    execute: createAutoConnectionHandler(
      API.workflowCommand.AutoDisconnect,
      true,
    ),
    condition: canAutoConnectOrDisconnect,
  },
};

export default workflowEditorShortcuts;
