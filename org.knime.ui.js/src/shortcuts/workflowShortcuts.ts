// TODO: NXT-2627 split this file
/* eslint-disable max-lines */
import RedoIcon from "webapps-common/ui/assets/img/icons/redo.svg";
import UndoIcon from "webapps-common/ui/assets/img/icons/undo.svg";
import DeleteIcon from "@/assets/delete.svg";
import OpenDialogIcon from "@/assets/configure-node.svg";
import SaveIcon from "webapps-common/ui/assets/img/icons/save.svg";
import SaveAsIcon from "webapps-common/ui/assets/img/icons/save-as.svg";
import ArrowMoveIcon from "webapps-common/ui/assets/img/icons/arrow-move.svg";
import SelectionModeIcon from "@/assets/selection-mode.svg";

import { portPositions } from "@/util/portShift";
import { nodeSize } from "@/style/shapes.mjs";
import { geometry } from "@/util/geometry";
import { isNodeMetaNode } from "@/util/nodeUtil";
import type { Connection, XY } from "@/api/gateway-api/generated-api";
import { getProjectAndWorkflowIds } from "../store/workflow/util";
import { getNextSelectedPort } from "@/util/portSelection";
import { API } from "@api";
import { compatibility, isDesktop } from "@/environment";

import type { KnimeNode } from "@/api/custom-types";
import { isUIExtensionFocused } from "@/components/uiExtensions";
import { getToastsProvider } from "@/plugins/toasts";

import type {
  ShortcutConditionContext,
  ShortcutExecuteContext,
  UnionToShortcutRegistry,
} from "./types";

type WorkflowShortcuts = UnionToShortcutRegistry<
  | "save"
  | "saveAs"
  | "undo"
  | "redo"
  | "configureNode"
  | "configureFlowVariables"
  | "activateOutputPort"
  | "activateFlowVarPort"
  | "detachOutputPort"
  | "detachFlowVarPort"
  | "detachActiveOutputPort"
  | "editAnnotation"
  | "editNodeComment"
  | "deleteSelected"
  | "copy"
  | "cut"
  | "paste"
  | "switchToPanMode"
  | "switchToSelectionMode"
  | "quickAddNode"
  | "autoConnectNodesDefault"
  | "autoConnectNodesFlowVar"
  | "autoDisconnectNodesDefault"
  | "autoDisconnectNodesFlowVar"
  | "shuffleSelectedPort"
>;

declare module "./index" {
  interface ShortcutsRegistry extends WorkflowShortcuts {}
}

const createAutoConnectionHandler =
  (
    command:
      | typeof API.workflowCommand.AutoConnect
      | typeof API.workflowCommand.AutoDisconnect,
  ) =>
  ({ $store, payload: { event } }: ShortcutExecuteContext) => {
    const { projectId, workflowId } = getProjectAndWorkflowIds(
      $store.state.workflow,
    );

    const flowVariablePortsOnly =
      (event as KeyboardEvent).key.toLowerCase() === "k";

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

const workflowShortcuts: WorkflowShortcuts = {
  save: {
    title: "Save workflow",
    text: "Save",
    hotkey: ["CtrlOrCmd", "S"],
    group: "general",
    icon: SaveIcon,
    execute: ({ $store }) => {
      if ($store.getters["application/activeProjectOrigin"]) {
        $store.dispatch("workflow/saveProject");
      } else {
        $store.dispatch("workflow/saveProjectAs");
      }
    },
    condition: ({ $store }) =>
      compatibility.isLocalSaveSupported() &&
      ($store.getters["application/isDirtyActiveProject"] ||
        !$store.getters["application/activeProjectOrigin"]),
  },
  saveAs: {
    title: "Save workflow as",
    text: "Save as…",
    icon: SaveAsIcon,
    execute: ({ $store }) => $store.dispatch("workflow/saveProjectAs"),
    condition: () => compatibility.isLocalSaveSupported(),
  },
  undo: {
    title: "Undo",
    hotkey: ["CtrlOrCmd", "Z"],
    group: "general",
    icon: UndoIcon,
    execute: ({ $store }) => $store.dispatch("workflow/undo"),
    condition: ({ $store }) =>
      Boolean($store.state.workflow.activeWorkflow?.allowedActions?.canUndo),
  },
  redo: {
    title: "Redo",
    hotkey: ["CtrlOrCmd", "Shift", "Z"],
    group: "general",
    icon: RedoIcon,
    execute: ({ $store }) => $store.dispatch("workflow/redo"),
    condition: ({ $store }) =>
      Boolean($store.state.workflow.activeWorkflow?.allowedActions?.canRedo),
  },
  configureNode: {
    text: "Configure",
    hotkey: ["F6"],
    icon: OpenDialogIcon,
    group: "execution",
    execute: ({ $store, payload = null }) => {
      const selectedNodeId =
        payload?.metadata?.nodeId ||
        $store.getters["selection/singleSelectedNode"].id;
      $store.dispatch("workflow/openNodeConfiguration", selectedNodeId);
    },
    condition: ({ $store }) => {
      const singleSelectedNode = $store.getters["selection/singleSelectedNode"];

      if (singleSelectedNode) {
        const { canOpenDialog } = singleSelectedNode.allowedActions;

        return (
          canOpenDialog &&
          compatibility.canConfigureNodes() &&
          $store.state.application.permissions.canConfigureNodes
        );
      }

      return false;
    },
  },
  configureFlowVariables: {
    text: "Configure flow variables",
    hotkey: ["Shift", "F6"],
    group: "execution",
    execute: ({ $store }) =>
      $store.dispatch(
        "workflow/openFlowVariableConfiguration",
        $store.getters["selection/singleSelectedNode"].id,
      ),
    condition: ({ $store }) => {
      const singleSelectedNode = $store.getters["selection/singleSelectedNode"];

      if (singleSelectedNode) {
        const { canOpenLegacyFlowVariableDialog } =
          singleSelectedNode.allowedActions;

        return (
          canOpenLegacyFlowVariableDialog &&
          compatibility.canConfigureFlowVariables() &&
          $store.state.application.permissions.canConfigureNodes
        );
      }

      return false;
    },
  },
  activateOutputPort: {
    text: "Activate the n-th output port view",
    hotkey: ["Shift", "1-9"],
    icon: OpenDialogIcon,
    group: "selectedNode",
    execute: ({ $store, payload }) => {
      const event = payload.event! as KeyboardEvent;
      const node = $store.getters["selection/singleSelectedNode"];
      let port = event.code.slice("Digit".length);

      if (port === "1" && node.hasView) {
        port = "view";
      } else if (isNodeMetaNode(node)) {
        // Metanodes don't have a flowvariable port and their port tabs are 0-indexed
        // eslint-disable-next-line no-magic-numbers
        port = String(Number(port) - 1);
      }

      if (Number(port) >= node.outPorts.length) {
        return;
      }

      $store.commit("selection/setActivePortTab", port);
    },
    condition: ({ $store }) => {
      const singleSelectedNode = $store.getters["selection/singleSelectedNode"];
      return singleSelectedNode && singleSelectedNode.outPorts.length > 0;
    },
  },
  activateFlowVarPort: {
    text: "Activate flow variable view",
    hotkey: ["Shift", "0"],
    additionalHotkeys: [{ key: ["Shift", "0-0"], visible: false }], // range matches Digit0 Key even with shift
    icon: OpenDialogIcon,
    group: "selectedNode",
    execute: ({ $store }) => {
      $store.commit("selection/setActivePortTab", "0");
    },
    condition: ({ $store }) => {
      const singleSelectedNode = $store.getters["selection/singleSelectedNode"];
      const portTypes = $store.state.application.availablePortTypes;
      const hasFlowVarPort =
        portTypes[singleSelectedNode?.outPorts[0]?.typeId]?.kind ===
        "flowVariable";

      return singleSelectedNode && hasFlowVarPort;
    },
  },
  detachOutputPort: {
    text: "Detach the n-th output port view",
    hotkey: ["Shift", "Alt", "1-9"],
    icon: OpenDialogIcon,
    group: "selectedNode",
    execute: ({ $store, payload }) => {
      const event = payload.event! as KeyboardEvent;
      const node = $store.getters["selection/singleSelectedNode"];

      let port = event.code.slice("Digit".length);

      if (port === "1" && node.hasView) {
        port = "view";
      } else if (isNodeMetaNode(node)) {
        // Metanodes don't have a flowvariable port and their port tabs are 0-indexed
        // eslint-disable-next-line no-magic-numbers
        port = String(Number(port) - 1);
      }

      if (Number(port) >= node.outPorts.length) {
        return;
      }

      $store.dispatch("workflow/openPortView", { node, port });
    },
    condition: ({ $store }) => {
      const singleSelectedNode = $store.getters["selection/singleSelectedNode"];
      return (
        isDesktop &&
        singleSelectedNode &&
        singleSelectedNode.outPorts.length > 0
      );
    },
  },

  detachFlowVarPort: {
    text: "Detach flow variable view",
    hotkey: ["Shift", "Alt", "0"],
    additionalHotkeys: [{ key: ["Shift", "Alt", "0-0"], visible: false }], // range matches Digit0 Key even with shift
    icon: OpenDialogIcon,
    group: "selectedNode",
    execute: ({ $store }) => {
      const node: KnimeNode = $store.getters["selection/singleSelectedNode"];

      if (node.state?.executionState === "EXECUTED") {
        $store.dispatch("workflow/openPortView", { node, port: "0" });
      } else {
        // TODO: NXT-2024 remove this condition once flowvars can be detached in 'configured' state
        getToastsProvider().show({
          id: "__FLOWVAR_DETACH_SHORTCUT_FAILED",
          headline: "Error detaching flow variable view",
          message: "Please execute the node.",
          type: "error",
        });
      }
    },
    condition: ({ $store }) => {
      const singleSelectedNode = $store.getters["selection/singleSelectedNode"];
      const portTypes = $store.state.application.availablePortTypes;
      const hasFlowVarPort =
        portTypes[singleSelectedNode?.outPorts[0]?.typeId]?.kind ===
        "flowVariable";

      return isDesktop && singleSelectedNode && hasFlowVarPort;
    },
  },

  detachActiveOutputPort: {
    text: "Detach active output port view",
    hotkey: ["Shift", "Alt", "Enter"],
    icon: OpenDialogIcon,
    group: "selectedNode",
    execute: ({ $store }) => {
      const port = $store.state.selection.activePortTab;
      const node = $store.getters["selection/singleSelectedNode"];

      $store.dispatch("workflow/openPortView", { node, port });
    },
    condition: ({ $store }) => {
      const singleSelectedNode = $store.getters["selection/singleSelectedNode"];
      const port = $store.state.selection.activePortTab;
      return isDesktop && singleSelectedNode && port;
    },
  },
  editNodeComment: {
    text: "Edit node comment",
    hotkey: ["F2"],
    group: "selectedNode",
    execute: ({ $store }) => {
      if ($store.getters["selection/singleSelectedNode"]) {
        $store.dispatch(
          "workflow/openLabelEditor",
          $store.getters["selection/singleSelectedNode"].id,
        );
      }
    },
    condition: ({ $store }) => {
      const singleSelectedNode = $store.getters["selection/singleSelectedNode"];
      const singleSelectedObject =
        $store.getters["selection/singleSelectedObject"];
      return (
        singleSelectedObject &&
        singleSelectedNode &&
        $store.getters["workflow/isWritable"]
      );
    },
  },
  editAnnotation: {
    text: "Edit annotation",
    hotkey: ["F2"],
    group: "workflowAnnotations",
    execute: ({ $store }) => {
      if ($store.getters["selection/singleSelectedAnnotation"]) {
        $store.dispatch(
          "workflow/setEditableAnnotationId",
          $store.getters["selection/singleSelectedAnnotation"].id,
        );
      }
    },
    condition: ({ $store }) => {
      const singleSelectedAnnotation =
        $store.getters["selection/singleSelectedAnnotation"];
      const singleSelectedObject =
        $store.getters["selection/singleSelectedObject"];

      return (
        singleSelectedObject &&
        singleSelectedAnnotation &&
        $store.getters["workflow/isWritable"]
      );
    },
  },
  deleteSelected: {
    text: "Delete",
    title: "Delete selection",
    hotkey: ["Delete"],
    group: "general",
    icon: DeleteIcon,
    execute: ({ $store }) => {
      if ($store.state.selection.activeNodePorts.selectedPort) {
        $store.dispatch("workflow/deleteSelectedPort");
      } else {
        $store.dispatch("workflow/deleteSelectedObjects");
      }
    },
    condition({ $store }) {
      if (!$store.getters["workflow/isWritable"]) {
        return false;
      }

      // enable depending on the selected NodePort
      if ($store.state.selection.activeNodePorts.selectedPort) {
        return !$store.state.selection.activeNodePorts.isModificationInProgress;
      }

      const selectedNodes: Array<KnimeNode> =
        $store.getters["selection/selectedNodes"];
      const selectedConnections: Array<Connection> =
        $store.getters["selection/selectedConnections"];
      const selectedAnnotations =
        $store.getters["selection/selectedAnnotations"];
      const selectedBendpoints =
        $store.getters["selection/selectedBendpointIds"];

      // disable if nothing selected
      if (
        selectedNodes.length === 0 &&
        selectedConnections.length === 0 &&
        selectedAnnotations.length === 0 &&
        selectedBendpoints.length === 0
      ) {
        return false;
      }

      const allSelectedDeletable =
        selectedNodes.every((node) => node.allowedActions?.canDelete) &&
        selectedConnections.every(
          (connection) => connection.allowedActions?.canDelete,
        );

      // enable if all selected objects are deletable
      return allSelectedDeletable;
    },
  },
  copy: {
    text: "Copy",
    title: "Copy selection",
    hotkey: ["CtrlOrCmd", "C"],
    group: "general",
    allowEventDefault: true,
    execute: ({ $store }) =>
      $store.dispatch("workflow/copyOrCutWorkflowParts", { command: "copy" }),
    condition: ({ $store }) => {
      if (isUIExtensionFocused()) {
        return false;
      }

      const selectedNodes = Object.keys(
        $store.getters["selection/selectedNodes"],
      );
      const selectedAnnotations =
        $store.getters["selection/selectedAnnotations"];

      const kanvas = $store.state.canvas.getScrollContainerElement();
      const kanvasIsActiveElement = document.activeElement === kanvas;
      const textSelectionIsEmpty = window?.getSelection()?.toString() === "";
      const isSomethingSelected =
        selectedNodes.length !== 0 || selectedAnnotations.length !== 0;

      return (
        isSomethingSelected &&
        $store.state.application.hasClipboardSupport &&
        (textSelectionIsEmpty || kanvasIsActiveElement)
      );
    },
  },
  cut: {
    text: "Cut",
    title: "Cut selection",
    hotkey: ["CtrlOrCmd", "X"],
    group: "general",
    execute: ({ $store }) =>
      $store.dispatch("workflow/copyOrCutWorkflowParts", { command: "cut" }),
    condition: ({ $store }) => {
      const selectedNodes = Object.keys(
        $store.getters["selection/selectedNodes"],
      );
      const selectedAnnotations =
        $store.getters["selection/selectedAnnotations"];
      const isSomethingSelected =
        selectedNodes.length !== 0 || selectedAnnotations.length !== 0;
      return (
        isSomethingSelected &&
        $store.getters["workflow/isWritable"] &&
        $store.state.application.hasClipboardSupport
      );
    },
  },
  paste: {
    text: "Paste",
    title: "Paste from clipboard",
    hotkey: ["CtrlOrCmd", "V"],
    group: "general",
    execute: ({ $store, payload }) =>
      $store.dispatch("workflow/pasteWorkflowParts", {
        position: payload?.metadata?.position,
      }),
    condition: ({ $store }) =>
      $store.getters["workflow/isWritable"] &&
      $store.state.application.hasClipboardSupport,
  },
  switchToSelectionMode: {
    hotkey: ["V"],
    text: "Selection mode",
    description: "Selection mode (default)",
    group: "workflowEditorModes",
    icon: SelectionModeIcon,
    execute: ({ $store }) => {
      $store.dispatch("application/switchCanvasMode", "selection");
    },
  },
  switchToPanMode: {
    hotkey: ["P"],
    text: "Pan mode",
    group: "workflowEditorModes",
    icon: ArrowMoveIcon,
    execute: ({ $store }) => {
      $store.dispatch("application/switchCanvasMode", "pan");
    },
    condition: ({ $store }) => !$store.getters["workflow/isWorkflowEmpty"],
  },
  quickAddNode: {
    text: "Quick add node",
    title: "Add new node",
    hotkey: ["CtrlOrCmd", "."],
    additionalHotkeys: [{ key: ["Ctrl", " " /* Space */], visible: false }],
    group: "workflowEditor",
    execute: ({ $store }) => {
      // destruct current state
      const { isOpen, props } = $store.state.workflow.quickAddNodeMenu;

      const { nodeId: lastNodeId, port, position: lastPosition } = props ?? {};
      const lastPortIndex = port?.index ?? -1;

      // use the node of the currently open dialog because the node might not be selected in that case
      const node: KnimeNode = isOpen
        ? $store.getters["workflow/getNodeById"](lastNodeId)
        : $store.getters["selection/singleSelectedNode"];

      // global menu without predecessor node
      if (node === null) {
        const position = geometry.findFreeSpaceAroundCenterWithFallback({
          visibleFrame: $store.getters["canvas/getVisibleFrame"](),
          nodes: $store.state.workflow.activeWorkflow!.nodes,
        });
        $store.dispatch("workflow/openQuickAddNodeMenu", {
          props: { position },
        });
        return;
      }

      const nodeId = node.id;
      const outPortCount = node.outPorts.length;

      // shuffle between port indices, start with the first non mickey-mouse (flowvar) port
      // if there is one, if not use the mickey-mouse port (index 0)
      const startIndex = outPortCount === 1 ? 0 : 1;
      const nextIndex = (lastPortIndex + 1) % outPortCount;
      const portIndex = lastNodeId === nodeId ? nextIndex : startIndex;

      // if it's not open we need to find a proper position to put the menu
      const calculatePosition = (
        node: KnimeNode,
        portIndex: number,
        portCount: number,
      ) => {
        const outPortPositions = portPositions({
          portCount,
          isMetanode: isNodeMetaNode(node),
          isOutports: true,
        });

        // eslint-disable-next-line no-magic-numbers
        const xOffset = nodeSize * 3;

        const startPoint: XY = {
          x: node.position.x + outPortPositions[portIndex][0] + xOffset,
          y: node.position.y + outPortPositions[portIndex][1],
        };

        return geometry.findFreeSpaceAroundPointWithFallback({
          startPoint,
          visibleFrame: $store.getters["canvas/getVisibleFrame"](),
          nodes: $store.state.workflow.activeWorkflow!.nodes,
        });
      };

      const outputPort = node.outPorts[portIndex];
      const position = isOpen
        ? lastPosition
        : calculatePosition(node, portIndex, outPortCount);

      $store.dispatch("workflow/openQuickAddNodeMenu", {
        props: { nodeId, port: outputPort, position },
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
    execute: createAutoConnectionHandler(API.workflowCommand.AutoConnect),
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
    text: "Disconnect nodes's flow variable ports",
    title: "Disconnect nodes's flow variable ports",
    hotkey: ["CtrlOrCmd", "Shift", "K"],
    group: "workflowEditor",
    execute: createAutoConnectionHandler(API.workflowCommand.AutoDisconnect),
    condition: canAutoConnectOrDisconnect,
  },
  shuffleSelectedPort: {
    text: "Select (next) port",
    title: "Select (next) port of the selected node",
    hotkey: ["Alt", "P"],
    group: "selectedNode",
    execute: ({ $store }) => {
      const node = $store.getters["selection/singleSelectedNode"];
      const currentSelectedPort =
        $store.state.selection.activeNodePorts.nodeId === node.id
          ? $store.state.selection.activeNodePorts.selectedPort
          : null;
      $store.commit("selection/updateActiveNodePorts", {
        nodeId: node.id,
        selectedPort: getNextSelectedPort($store, node, currentSelectedPort),
      });
    },
    condition: ({ $store }) => {
      const node: KnimeNode = $store.getters["selection/singleSelectedNode"];
      return Boolean(node) && $store.getters["workflow/isWritable"];
    },
  },
};

export default workflowShortcuts;
