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
import type { XY } from "@/api/gateway-api/generated-api";

import type { UnionToShortcutRegistry } from "./types";

type WorkflowShortcuts = UnionToShortcutRegistry<
  | "save"
  | "saveAs"
  | "undo"
  | "redo"
  | "configureNode"
  | "configureFlowVariables"
  | "editName"
  | "editNodeComment"
  | "deleteSelected"
  | "copy"
  | "cut"
  | "paste"
  | "switchToPanMode"
  | "switchToSelectionMode"
  | "quickAddNode"
>;

declare module "./index" {
  interface ShortcutsRegistry extends WorkflowShortcuts {}
}

const workflowShortcuts: WorkflowShortcuts = {
  save: {
    title: "Save workflow",
    text: "Save",
    hotkey: ["Ctrl", "S"],
    icon: SaveIcon,
    execute: ({ $store }) => {
      if ($store.getters["application/activeProjectOrigin"]) {
        $store.dispatch("workflow/saveWorkflow");
      } else {
        $store.dispatch("workflow/saveWorkflowAs");
      }
    },
    condition: ({ $store }) =>
      $store.state.workflow.activeWorkflow?.dirty ||
      !$store.getters["application/activeProjectOrigin"],
  },
  saveAs: {
    title: "Save workflow as",
    text: "Save as…",
    icon: SaveAsIcon,
    execute: ({ $store }) => $store.dispatch("workflow/saveWorkflowAs"),
  },
  undo: {
    title: "Undo",
    hotkey: ["Ctrl", "Z"],
    icon: UndoIcon,
    execute: ({ $store }) => $store.dispatch("workflow/undo"),
    condition: ({ $store }) =>
      $store.state.workflow.activeWorkflow?.allowedActions.canUndo,
  },
  redo: {
    title: "Redo",
    hotkey: ["Ctrl", "Shift", "Z"],
    icon: RedoIcon,
    execute: ({ $store }) => $store.dispatch("workflow/redo"),
    condition: ({ $store }) =>
      $store.state.workflow.activeWorkflow?.allowedActions.canRedo,
  },
  configureNode: {
    text: "Configure",
    hotkey: ["F6"],
    icon: OpenDialogIcon,
    execute: ({ $store, payload = null }) => {
      const selectedNodeId =
        payload?.metadata?.nodeId ||
        $store.getters["selection/singleSelectedNode"].id;
      $store.dispatch("workflow/openNodeConfiguration", selectedNodeId);
    },
    condition: ({ $store }) =>
      $store.getters["selection/singleSelectedNode"]?.allowedActions
        .canOpenDialog,
  },
  configureFlowVariables: {
    text: "Configure flow variables",
    hotkey: ["Shift", "F6"],
    execute: ({ $store }) =>
      $store.dispatch(
        "workflow/openFlowVariableConfiguration",
        $store.getters["selection/singleSelectedNode"].id,
      ),
    condition: ({ $store }) =>
      $store.getters["selection/singleSelectedNode"]?.allowedActions
        .canOpenLegacyFlowVariableDialog,
  },
  editName: {
    text: ({ $store }) =>
      `Rename ${$store.getters["selection/singleSelectedNode"]?.kind}`,
    hotkey: ["Shift", "F2"],
    execute: ({ $store }) =>
      $store.dispatch(
        "workflow/openNameEditor",
        $store.getters["selection/singleSelectedNode"].id,
      ),
    condition: ({ $store }) =>
      ["metanode", "component"].includes(
        $store.getters["selection/singleSelectedNode"]?.kind,
      ) &&
      !$store.getters["selection/singleSelectedNode"]?.link &&
      $store.getters["workflow/isWritable"],
  },
  editNodeComment: {
    text: "Edit node comment",
    hotkey: ["F2"],
    execute: ({ $store }) =>
      $store.dispatch(
        "workflow/openLabelEditor",
        $store.getters["selection/singleSelectedNode"].id,
      ),
    condition: ({ $store }) => {
      const singleSelectedNode = $store.getters["selection/singleSelectedNode"];

      return (
        singleSelectedNode !== null && $store.getters["workflow/isWritable"]
      );
    },
  },
  deleteSelected: {
    text: "Delete",
    title: "Delete selection",
    hotkey: ["Delete"],
    icon: DeleteIcon,
    execute: ({ $store }) => $store.dispatch("workflow/deleteSelectedObjects"),
    condition({ $store }) {
      if (!$store.getters["workflow/isWritable"]) {
        return false;
      }

      const selectedNodes = $store.getters["selection/selectedNodes"];
      const selectedConnections =
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
        selectedNodes.every((node) => node.allowedActions.canDelete) &&
        selectedConnections.every(
          (connection) => connection.allowedActions.canDelete,
        );

      // enabled, if all selected objects are deletable
      return allSelectedDeletable;
    },
  },
  copy: {
    text: "Copy",
    title: "Copy selection",
    hotkey: ["Ctrl", "C"],
    allowEventDefault: true,
    execute: ({ $store }) =>
      $store.dispatch("workflow/copyOrCutWorkflowParts", { command: "copy" }),
    condition: ({ $store }) => {
      const nodeOutput = document.querySelector("#node-output");

      if (nodeOutput.contains(document.activeElement)) {
        return false;
      }

      const selectedNodes = Object.keys(
        $store.getters["selection/selectedNodes"],
      );
      const selectedAnnotations =
        $store.getters["selection/selectedAnnotations"];

      const kanvas = $store.state.canvas.getScrollContainerElement();
      const kanvasIsActiveElement = document.activeElement === kanvas;
      const textSelectionIsEmpty = window?.getSelection().toString() === "";
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
    hotkey: ["Ctrl", "X"],
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
    hotkey: ["Ctrl", "V"],
    execute: ({ $store, payload }) =>
      $store.dispatch("workflow/pasteWorkflowParts", {
        position: payload?.metadata?.position,
      }),
    condition: ({ $store }) =>
      $store.getters["workflow/isWritable"] &&
      $store.state.application.hasClipboardSupport,
  },
  switchToPanMode: {
    hotkey: ["P"],
    text: "Pan mode",
    icon: ArrowMoveIcon,
    execute: ({ $store }) => {
      $store.dispatch("application/switchCanvasMode", "pan");
    },
    condition: ({ $store }) => !$store.getters["workflow/isWorkflowEmpty"],
  },
  switchToSelectionMode: {
    hotkey: ["V"],
    text: "Selection mode",
    icon: SelectionModeIcon,
    execute: ({ $store }) => {
      $store.dispatch("application/switchCanvasMode", "selection");
    },
  },
  quickAddNode: {
    text: "Quick add node",
    title: "Add new node",
    hotkey: ["Ctrl", "."],
    execute: ({ $store }) => {
      // destruct current state
      const { isOpen, props } = $store.state.workflow.quickAddNodeMenu;

      const {
        nodeId: lastNodeId,
        port: { index: lastPortIndex } = { index: -1 },
        position: lastPosition,
      } = props ?? {};

      // use the node of the currently open dialog because the node might not be selected in that case
      const node = isOpen
        ? $store.getters["workflow/getNodeById"](lastNodeId)
        : $store.getters["selection/singleSelectedNode"];

      // global menu without predecessor node
      if (node === null) {
        const position = geometry.findFreeSpaceAroundCenterWithFallback({
          visibleFrame: $store.getters["canvas/getVisibleFrame"](),
          nodes: $store.state.workflow.activeWorkflow.nodes,
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
      const calculatePosition = (node, portIndex, portCount, $store) => {
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
          nodes: $store.state.workflow.activeWorkflow.nodes,
        });
      };

      const port = node.outPorts[portIndex];
      const position = isOpen
        ? lastPosition
        : calculatePosition(node, portIndex, outPortCount, $store);

      $store.dispatch("workflow/openQuickAddNodeMenu", {
        props: { nodeId, port, position },
      });
    },
    condition: ({ $store }) => $store.getters["workflow/isWritable"],
  },
};

export default workflowShortcuts;
