import OpenDialogIcon from "@/assets/configure-node.svg";

import ArrowMoveIcon from "webapps-common/ui/assets/img/icons/arrow-move.svg";
import SelectionModeIcon from "@/assets/selection-mode.svg";

import { compatibility } from "@/environment";

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
};

export default otherWorkflowShortcuts;
