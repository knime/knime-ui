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
import { compatibility } from "@/environment";

import type { UnionToShortcutRegistry } from "./types";
import type { KnimeNode } from "@/api/custom-types";
import { isUIExtensionFocused } from "@/components/uiExtensions";

type WorkflowShortcuts = UnionToShortcutRegistry<
  | "save"
  | "saveAs"
  | "undo"
  | "redo"
  | "configureNode"
  | "configureFlowVariables"
  | "editAnnotation"
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
    hotkey: ["Ctrl", "Z"],
    group: "general",
    icon: UndoIcon,
    execute: ({ $store }) => $store.dispatch("workflow/undo"),
    condition: ({ $store }) =>
      Boolean($store.state.workflow.activeWorkflow?.allowedActions?.canUndo),
  },
  redo: {
    title: "Redo",
    hotkey: ["Ctrl", "Shift", "Z"],
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
  editNodeComment: {
    text: "Edit node comment",
    hotkey: ["F2"],
    group: "nodeLabels",
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
    execute: ({ $store }) => $store.dispatch("workflow/deleteSelectedObjects"),
    condition({ $store }) {
      if (!$store.getters["workflow/isWritable"]) {
        return false;
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

      // enabled, if all selected objects are deletable
      return allSelectedDeletable;
    },
  },
  copy: {
    text: "Copy",
    title: "Copy selection",
    hotkey: ["Ctrl", "C"],
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
    hotkey: ["Ctrl", "X"],
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
    hotkey: ["Ctrl", "V"],
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
    hotkey: ["Ctrl", "."],
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
};

export default workflowShortcuts;
