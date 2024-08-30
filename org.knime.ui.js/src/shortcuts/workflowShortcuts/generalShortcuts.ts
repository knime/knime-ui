import type { UnionToShortcutRegistry } from "../types";
import RedoIcon from "@knime/styles/img/icons/redo.svg";
import UndoIcon from "@knime/styles/img/icons/undo.svg";
import DeleteIcon from "@/assets/delete.svg";
import SaveIcon from "@knime/styles/img/icons/save.svg";
import SaveAsIcon from "@knime/styles/img/icons/save-as.svg";
import FileExportIcon from "@knime/styles/img/icons/file-export.svg";
import { isUIExtensionFocused } from "@/components/uiExtensions";
import type { KnimeNode } from "@/api/custom-types";
import type { Connection } from "@/api/gateway-api/generated-api";

type GeneralNodeWorkflowShortcuts = UnionToShortcutRegistry<
  | "save"
  | "saveAs"
  | "undo"
  | "redo"
  | "deleteSelected"
  | "copy"
  | "cut"
  | "paste"
  | "export"
>;

const generalWorkflowShortcuts: GeneralNodeWorkflowShortcuts = {
  save: {
    title: "Save workflow",
    text: "Save",
    hotkey: ["CtrlOrCmd", "S"],
    group: "general",
    icon: SaveIcon,
    execute: ({ $store }) => {
      const isUnknownProject = $store.getters["application/isUnknownProject"];
      const activeProjectId = $store.state.application.activeProjectId;

      if (isUnknownProject(activeProjectId)) {
        $store.dispatch("workflow/saveProjectAs");
      } else {
        $store.dispatch("workflow/saveProject");
      }
    },
    condition: ({ $store }) => {
      const activeProjectId = $store.state.application.activeProjectId;

      return (
        activeProjectId &&
        $store.state.uiControls.isLocalSaveSupported &&
        ($store.getters["application/isDirtyActiveProject"] ||
          !$store.getters["application/activeProjectOrigin"])
      );
    },
  },
  saveAs: {
    title: "Save workflow as",
    text: "Save as…",
    icon: SaveAsIcon,
    execute: ({ $store }) => $store.dispatch("workflow/saveProjectAs"),
    condition: ({ $store }) => $store.state.uiControls.isLocalSaveSupported,
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

      // disable while dragging
      if ($store.state.workflow.isDragging) {
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
  export: {
    title: "Export",
    text: "Export",
    icon: FileExportIcon,
    hotkey: ["CtrlOrCmd", "E"],
    group: "general",
    execute: ({ $store }) => {
      const activeProjectOrigin =
        $store.getters["application/activeProjectOrigin"];
      const activeProjectId =
        activeProjectOrigin?.projectId ||
        $store.state.application.activeProjectId;

      $store.dispatch("spaces/exportSpaceItem", {
        projectId: activeProjectId,
        itemId: activeProjectOrigin?.itemId,
      });
    },
    condition: ({ $store }) => {
      const activeProjectId = $store.state.application.activeProjectId;
      return Boolean(activeProjectId);
    },
  },
};

export default generalWorkflowShortcuts;
