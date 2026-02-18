import { API } from "@api";

import FileExportIcon from "@knime/styles/img/icons/file-export.svg";
import RedoIcon from "@knime/styles/img/icons/redo.svg";
import SaveAsIcon from "@knime/styles/img/icons/save-as.svg";
import SaveIcon from "@knime/styles/img/icons/save.svg";
import UndoIcon from "@knime/styles/img/icons/undo.svg";

import type { KnimeNode } from "@/api/custom-types";
import { type Connection, SyncState } from "@/api/gateway-api/generated-api";
import DeleteIcon from "@/assets/delete.svg";
import { isUIExtensionFocused } from "@/components/uiExtensions";
import { getKanvasDomElement } from "@/lib/workflow-canvas";
import { useApplicationStore } from "@/store/application/application";
import { useDirtyProjectsTrackingStore } from "@/store/application/dirtyProjectsTracking";
import { useApplicationSettingsStore } from "@/store/application/settings";
import { useSelectionStore } from "@/store/selection";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";
import { useUIControlsStore } from "@/store/uiControls/uiControls";
import { useClipboardInteractionsStore } from "@/store/workflow/clipboardInteractions";
import { useDesktopInteractionsStore } from "@/store/workflow/desktopInteractions";
import { useMovingStore } from "@/store/workflow/moving";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { getToastPresets } from "@/toastPresets";
import type { UnionToShortcutRegistry } from "../types";

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
    execute: () => {
      const { isLocalSaveSupported, isAutoSyncSupported } =
        useUIControlsStore();

      if (isLocalSaveSupported) {
        const { isUnknownProject, activeProjectId } = useApplicationStore();
        if (isUnknownProject(activeProjectId)) {
          useDesktopInteractionsStore().saveProjectAs();
        } else {
          useDesktopInteractionsStore().saveProject();
        }
        return;
      }

      if (isAutoSyncSupported) {
        const { activeProjectId } = useApplicationStore();
        API.workflow.saveProject({ projectId: activeProjectId! });
      }
    },
    condition: () => {
      const { activeWorkflow } = useWorkflowStore();
      const { activeProjectId, activeProjectOrigin } = useApplicationStore();
      const { isDirtyActiveProject } = useDirtyProjectsTrackingStore();
      const { isLocalSaveSupported, isAutoSyncSupported } =
        useUIControlsStore();

      const localSaveCondition =
        isLocalSaveSupported && (isDirtyActiveProject || !activeProjectOrigin);

      const autoSyncCondition =
        isAutoSyncSupported &&
        activeWorkflow?.syncState &&
        [SyncState.StateEnum.DIRTY, SyncState.StateEnum.ERROR].includes(
          activeWorkflow.syncState.state,
        );

      return Boolean(
        activeProjectId && (localSaveCondition || autoSyncCondition),
      );
    },
  },
  saveAs: {
    title: "Save workflow as",
    text: "Save as…",
    icon: SaveAsIcon,
    execute: () => useDesktopInteractionsStore().saveProjectAs(),
    condition: () => useUIControlsStore().isLocalSaveSupported,
  },
  undo: {
    title: "Undo",
    hotkey: ["CtrlOrCmd", "Z"],
    group: "general",
    icon: UndoIcon,
    execute: () => useWorkflowStore().undo(),
    condition: () =>
      Boolean(useWorkflowStore().activeWorkflow?.allowedActions?.canUndo),
  },
  redo: {
    title: "Redo",
    hotkey: ["CtrlOrCmd", "Shift", "Z"],
    group: "general",
    icon: RedoIcon,
    execute: () => useWorkflowStore().redo(),
    condition: () =>
      Boolean(useWorkflowStore().activeWorkflow?.allowedActions?.canRedo),
  },
  deleteSelected: {
    text: "Delete",
    title: "Delete selection",
    hotkey: ["Delete"],
    group: "general",
    icon: DeleteIcon,
    execute: async () => {
      const workflowStore = useWorkflowStore();
      if (useSelectionStore().selectedNodePort.selectedPortId) {
        await workflowStore.deleteSelectedPort();
      } else {
        await workflowStore.deleteSelectedObjects();
      }
    },
    condition: () => {
      const workflowStore = useWorkflowStore();
      const selectionStore = useSelectionStore();

      if (!workflowStore.isWritable) {
        return false;
      }

      // enable depending on the selected NodePort
      if (selectionStore.selectedNodePort.selectedPortId) {
        return !selectionStore.selectedNodePort.isModificationInProgress;
      }

      // disable while dragging
      if (useMovingStore().isDragging) {
        return false;
      }

      const selectedNodes: Array<KnimeNode> = selectionStore.getSelectedNodes;
      const selectedConnections: Array<Connection> =
        selectionStore.getSelectedConnections;
      const selectedAnnotations = selectionStore.getSelectedAnnotations;
      const selectedBendpoints = selectionStore.selectedBendpointIds;

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
    execute: () =>
      useClipboardInteractionsStore().copyOrCutWorkflowParts({
        command: "copy",
      }),
    condition: () => {
      if (isUIExtensionFocused()) {
        return false;
      }

      const selectionStore = useSelectionStore();
      const selectedNodes = selectionStore.getSelectedNodes;
      const selectedAnnotations = selectionStore.getSelectedAnnotations;

      const kanvas = getKanvasDomElement();
      const kanvasIsActiveElement = document.activeElement === kanvas;
      const textSelectionIsEmpty = window?.getSelection()?.toString() === "";
      const isSomethingSelected =
        selectedNodes.length !== 0 || selectedAnnotations.length !== 0;

      return (
        isSomethingSelected &&
        useApplicationSettingsStore().hasClipboardSupport &&
        (textSelectionIsEmpty || kanvasIsActiveElement)
      );
    },
  },
  cut: {
    text: "Cut",
    title: "Cut selection",
    hotkey: ["CtrlOrCmd", "X"],
    group: "general",
    execute: () =>
      useClipboardInteractionsStore().copyOrCutWorkflowParts({
        command: "cut",
      }),
    condition: () => {
      const selectionStore = useSelectionStore();
      const selectedNodes = selectionStore.getSelectedNodes;
      const selectedAnnotations = selectionStore.getSelectedAnnotations;

      const isSomethingSelected =
        selectedNodes.length !== 0 || selectedAnnotations.length !== 0;

      return (
        isSomethingSelected &&
        useWorkflowStore().isWritable &&
        useApplicationSettingsStore().hasClipboardSupport
      );
    },
  },
  paste: {
    text: "Paste",
    title: "Paste from clipboard",
    hotkey: ["CtrlOrCmd", "V"],
    group: "general",
    execute: ({ payload }) =>
      useClipboardInteractionsStore().pasteWorkflowParts({
        position: payload?.metadata?.position,
      }),
    condition: () =>
      useWorkflowStore().isWritable &&
      useApplicationSettingsStore().hasClipboardSupport,
  },
  export: {
    title: "Export",
    text: "Export",
    icon: FileExportIcon,
    hotkey: ["CtrlOrCmd", "E"],
    group: "general",
    execute: () => {
      const { activeProjectId, activeProjectOrigin } = useApplicationStore();

      useSpaceOperationsStore()
        .exportSpaceItem({
          projectId: activeProjectId!,
          itemId: activeProjectOrigin!.itemId,
        })
        .catch((error) => {
          const { toastPresets } = getToastPresets();
          toastPresets.spaces.crud.exportItemFailed({ error });
        });
    },
    condition: () => {
      const { activeProjectId, activeProjectOrigin } = useApplicationStore();
      return Boolean(activeProjectId && activeProjectOrigin);
    },
  },
};

export default generalWorkflowShortcuts;
