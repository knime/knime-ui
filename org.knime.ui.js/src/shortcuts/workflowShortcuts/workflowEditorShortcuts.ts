/* eslint-disable complexity */
import { API } from "@api";

import { useAnalyticsService } from "@/analytics";
import type { KnimeNode, NodeRelation } from "@/api/custom-types";
import type { XY } from "@/api/gateway-api/generated-api";
import type { QuickActionMenuMode } from "@/components/workflowEditor/CanvasAnchoredComponents/QuickActionMenu/QuickActionMenu.vue";
import { ports as portDataMappers } from "@/lib/data-mappers";
import { freeSpaceInCanvas, ports } from "@/lib/workflow-canvas";
import { workflowDomain } from "@/lib/workflow-domain";
import { useApplicationStore } from "@/store/application/application";
import { useCurrentCanvasStore } from "@/store/canvas/useCurrentCanvasStore";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import { useSelectionStore } from "@/store/selection";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { nodeSize } from "@/style/shapes";
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
  const { isWritable } = useWorkflowStore();

  if (!isWritable) {
    return false;
  }

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
  const portPositionValues = ports.positions({
    portCount,
    isMetanode: workflowDomain.node.isMetaNode(node),
    isOutports,
  });
  const xOffset = nodeSize * (isOutports ? 3 : -3);
  const startPoint: XY = {
    x: node.position.x + portPositionValues[portIndex][0] + xOffset,
    y: node.position.y + portPositionValues[portIndex][1],
  };
  return freeSpaceInCanvas.aroundPointWithFallback({
    startPoint,
    visibleFrame: useCurrentCanvasStore().value.getVisibleFrame,
    nodes: useWorkflowStore().activeWorkflow!.nodes,
  });
};

const openQuickActionMenu = (
  { payload }: ShortcutExecuteContext,
  menuMode: QuickActionMenuMode,
) => {
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
      freeSpaceInCanvas.aroundCenterWithFallback({
        visibleFrame: useCurrentCanvasStore().value.getVisibleFrame,
        nodes: useWorkflowStore().activeWorkflow!.nodes,
      });

    store.openQuickActionMenu({
      props: {
        position,
        initialMode: menuMode,
      },
    });

    return { opened: true, target: null };
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
  const portIndex = lastNodeId === predecessorNode.id ? nextIndex : startIndex;

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

  return { opened: true, target: { node: predecessorNode, port: nextPort } };
};

const workflowEditorShortcuts: WorkflowEditorShortcuts = {
  openQuickNodeInsertionMenu: {
    text: "Quick add node",
    title: "Quick add node",
    hotkey: ["CtrlOrCmd", "."],
    additionalHotkeys: [{ key: ["Ctrl", " " /* Space */], visible: false }],
    group: "workflowEditor",
    execute: (ctx) => {
      const { opened, target } = openQuickActionMenu(ctx, "quick-add");

      if (!opened) {
        return;
      }

      const trackSource =
        ctx.payload.src === "global"
          ? "qam_opened::keyboard_shortcut_"
          : "qam_opened::canvas_ctxmenu_quickaddnode";

      let args: {
        nodeId?: string;
        nodeType?: string;
        nodePortIndex?: number;
        connectionType?: string;
      } = {};

      if (target) {
        const { availablePortTypes } = useApplicationStore();
        const extendedPortObject = portDataMappers.toExtendedPortObject(
          availablePortTypes,
        )(target.port.typeId);

        args.nodeId = target.node.id;
        args.nodeType = target.node.kind;
        args.connectionType = extendedPortObject.kind;
        args.nodePortIndex = target.port.index;
      }

      useAnalyticsService().track(trackSource, args);
    },
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
    execute: (ctx) => {
      openQuickActionMenu(ctx, "quick-build");
    },
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
