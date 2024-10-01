import type {
  ShortcutConditionContext,
  ShortcutExecuteContext,
  UnionToShortcutRegistry,
} from "../types";
import type { KnimeNode } from "@/api/custom-types";

import { API } from "@/api";
import { portPositions } from "@/util/portShift";
import { nodeSize } from "@/style/shapes";
import { geometry } from "@/util/geometry";
import { isNodeMetaNode } from "@/util/nodeUtil";
import type { XY } from "@/api/gateway-api/generated-api";
import { getProjectAndWorkflowIds } from "../../store/workflow/util";

type WorkflowEditorShortcuts = UnionToShortcutRegistry<
  | "quickAddNode"
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
  ({ $store }: ShortcutExecuteContext) => {
    const { projectId, workflowId } = getProjectAndWorkflowIds(
      $store.state.workflow,
    );

    const selectedNodes: string[] = $store.getters["selection/selectedNodeIds"];

    const selectedPortBars: Array<"out" | "in"> =
      $store.getters["selection/selectedMetanodePortBars"];

    command({
      projectId,
      workflowId,
      selectedNodes,
      workflowInPortsBarSelected: selectedPortBars.includes("in"),
      workflowOutPortsBarSelected: selectedPortBars.includes("out"),
      flowVariablePortsOnly,
    });
  };

const canAutoConnectOrDisconnect = ({ $store }: ShortcutConditionContext) => {
  const selectedNodes: Array<KnimeNode> =
    $store.getters["selection/selectedNodes"];

  const selectedPortBars: Array<"out" | "in"> =
    $store.getters["selection/selectedMetanodePortBars"];

  const isSingleNodeSelected = selectedNodes.length === 1;
  const isAnyPortBarSelected = selectedPortBars.length !== 0;
  const isMultipleNodesSelected = selectedNodes.length > 1;

  return isSingleNodeSelected ? isAnyPortBarSelected : isMultipleNodesSelected;
};

const workflowEditorShortcuts: WorkflowEditorShortcuts = {
  quickAddNode: {
    text: "Quick add node",
    title: "Add new node",
    hotkey: ["CtrlOrCmd", "."],
    additionalHotkeys: [{ key: ["Ctrl", " " /* Space */], visible: false }],
    group: "workflowEditor",
    execute: ({ $store, payload }) => {
      // destruct current state
      const positionFromContextMenu = payload?.metadata?.position;
      const { isOpen, props } = $store.state.workflow.quickAddNodeMenu;

      const {
        nodeId: lastNodeId,
        port,
        position: lastPosition,
        nodeRelation,
        positionOrigin: lastPositionOrigin,
      } = props ?? {};
      const lastPortIndex = port?.index ?? -1;

      // use the node of the currently open dialog because the node might not be selected in that case
      const node: KnimeNode = isOpen
        ? $store.getters["workflow/getNodeById"](lastNodeId)
        : $store.getters["selection/singleSelectedNode"];

      // global menu without predecessor node
      if (node === null) {
        const position =
          positionFromContextMenu ??
          geometry.findFreeSpaceAroundCenterWithFallback({
            visibleFrame: $store.getters["canvas/getVisibleFrame"](),
            nodes: $store.state.workflow.activeWorkflow!.nodes,
          });
        $store.dispatch("workflow/openQuickAddNodeMenu", {
          props: { position },
        });
        return;
      }

      const nodeId = node.id;
      // shuffle between ports, starts in the outPort side with the first flowvar port, then the other ports in the same side and last the flowvar port
      // then change to the inPort side with the same order
      let nextSide = nodeRelation || "SUCCESSORS";
      if (lastPortIndex === 0) {
        nextSide =
          nodeRelation === "SUCCESSORS" ? "PREDECESSORS" : "SUCCESSORS";
      }
      const portCount =
        nextSide === "SUCCESSORS" ? node.outPorts.length : node.inPorts.length;
      const startIndex = portCount === 1 ? 0 : 1;
      const nextIndex =
        nextSide === nodeRelation
          ? (lastPortIndex + 1) % portCount
          : startIndex;
      const portIndex = lastNodeId === nodeId ? nextIndex : startIndex;

      // if it's not open we need to find a proper position to put the menu
      const calculatePosition = (
        node: KnimeNode,
        portIndex: number,
        portCount: number,
      ) => {
        const isOutports = nextSide === "SUCCESSORS";
        const portPositionValues = portPositions({
          portCount,
          isMetanode: isNodeMetaNode(node),
          isOutports,
        });

        // eslint-disable-next-line no-magic-numbers
        const xOffset = nodeSize * (isOutports ? 3 : -3);

        const startPoint: XY = {
          x: node.position.x + portPositionValues[portIndex][0] + xOffset,
          y: node.position.y + portPositionValues[portIndex][1],
        };

        return geometry.findFreeSpaceAroundPointWithFallback({
          startPoint,
          visibleFrame: $store.getters["canvas/getVisibleFrame"](),
          nodes: $store.state.workflow.activeWorkflow!.nodes,
        });
      };

      const nextPort =
        nextSide === "SUCCESSORS"
          ? node.outPorts[portIndex]
          : node.inPorts[portIndex];

      const portSideWillChange = nextSide !== nodeRelation;
      const portSideChangesForCalculatedPosition =
        portSideWillChange && lastPositionOrigin !== "mouse";
      const useLastPosition = isOpen && !portSideChangesForCalculatedPosition;
      const position = useLastPosition
        ? lastPosition
        : calculatePosition(node, portIndex, portCount);

      $store.dispatch("workflow/openQuickAddNodeMenu", {
        props: {
          nodeId,
          port: nextPort,
          position,
          nodeRelation: nextSide,
          positionOrigin: useLastPosition ? lastPositionOrigin : "calculated",
        },
      });
    },
    condition: ({ $store }) => $store.getters["workflow/isWritable"],
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
