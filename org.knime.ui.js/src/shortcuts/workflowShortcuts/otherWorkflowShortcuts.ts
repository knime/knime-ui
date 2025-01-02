import ArrowMoveIcon from "@knime/styles/img/icons/arrow-move.svg";

import { Node } from "@/api/gateway-api/generated-api";
import OpenDialogIcon from "@/assets/configure-node.svg";
import SelectionModeIcon from "@/assets/selection-mode.svg";
import { useCanvasModesStore } from "@/store/application/canvasModes";
import { useApplicationSettingsStore } from "@/store/application/settings";
import { useSelectionStore } from "@/store/selection";
import { useUIControlsStore } from "@/store/uiControls/uiControls";
import { useAnnotationInteractionsStore } from "@/store/workflow/annotationInteractions";
import { useDesktopInteractionsStore } from "@/store/workflow/desktopInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import type { UnionToShortcutRegistry } from "../types";

type OtherWorkflowShortcuts = UnionToShortcutRegistry<
  | "configureNode"
  | "configureFlowVariables"
  | "editAnnotation"
  | "switchToPanMode"
  | "switchToSelectionMode"
>;

const otherWorkflowShortcuts: OtherWorkflowShortcuts = {
  configureNode: {
    text: "Configure",
    hotkey: ["F6"],
    icon: OpenDialogIcon,
    group: "execution",
    execute: ({ payload = null }) => {
      const selectedNodeId =
        payload?.metadata?.nodeId || useSelectionStore().singleSelectedNode!.id;

      useDesktopInteractionsStore().openNodeConfiguration(selectedNodeId);
    },
    condition: () => {
      const { singleSelectedNode } = useSelectionStore();

      const { useEmbeddedDialogs } = useApplicationSettingsStore();

      if (!singleSelectedNode) {
        return false;
      }

      const canConfigureNodes =
        useUIControlsStore().canConfigureNodes &&
        Boolean(singleSelectedNode.dialogType);

      if (useEmbeddedDialogs) {
        const hasLegacyDialog =
          singleSelectedNode.dialogType === Node.DialogTypeEnum.Swing;

        // only allow this option for legacy dialogs
        return hasLegacyDialog && canConfigureNodes;
      }

      return canConfigureNodes;
    },
  },
  configureFlowVariables: {
    text: "Configure flow variables",
    hotkey: ["Shift", "F6"],
    group: "execution",
    execute: () =>
      useDesktopInteractionsStore().openFlowVariableConfiguration(
        useSelectionStore().singleSelectedNode!.id,
      ),
    condition: () => {
      const { singleSelectedNode } = useSelectionStore();

      if (singleSelectedNode) {
        return Boolean(
          singleSelectedNode.allowedActions?.canOpenLegacyFlowVariableDialog &&
            useUIControlsStore().canConfigureFlowVariables,
        );
      }

      return false;
    },
  },
  editAnnotation: {
    text: "Edit annotation",
    hotkey: ["F2"],
    group: "workflowAnnotations",
    execute: () => {
      useAnnotationInteractionsStore().setEditableAnnotationId(
        useSelectionStore().singleSelectedAnnotation!.id,
      );
    },
    condition: () => {
      const { singleSelectedAnnotation, singleSelectedObject } =
        useSelectionStore();

      return Boolean(
        singleSelectedObject &&
          singleSelectedAnnotation &&
          useWorkflowStore().isWritable,
      );
    },
  },

  switchToSelectionMode: {
    hotkey: ["V"],
    text: "Selection mode",
    description: "Selection mode (default)",
    group: "workflowEditorModes",
    icon: SelectionModeIcon,
    execute: () => {
      useCanvasModesStore().switchCanvasMode("selection");
    },
  },
  switchToPanMode: {
    hotkey: ["P"],
    text: "Pan mode",
    group: "workflowEditorModes",
    icon: ArrowMoveIcon,
    execute: () => {
      useCanvasModesStore().switchCanvasMode("pan");
    },
    condition: () => !useWorkflowStore().isWorkflowEmpty,
  },
};

export default otherWorkflowShortcuts;
