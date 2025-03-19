import { useCurrentCanvasStore } from "@/store/canvas/useCurrentCanvasStore";
import { useUIControlsStore } from "@/store/uiControls/uiControls";
import { useWorkflowStore } from "@/store/workflow/workflow";

import annotationShortcuts from "./annotationShortcuts";
import applicationShortcuts from "./applicationShortcuts";
import canvasShortcuts from "./canvasShortcuts";
import componentOrMetanodeShortcuts from "./componentOrMetanodeShortcuts";
import executionShortcuts from "./executionShortcuts";
import {
  selectionShortcuts,
  sidePanelShortcuts,
  uiScaleShortcuts,
} from "./miscShortcuts";
import nodeAlignShortcuts from "./nodeAlignShortcuts";
import workflowShortcuts from "./workflowShortcuts";

// This interface will be enhanced and extended by the
// other files which also declare shortcuts
export interface ShortcutsRegistry {}

// chains a group condition before each individual shortcut condition
// exported for testing purposes
export const conditionGroup = (
  groupCondition: () => boolean,
  shortcuts: Partial<ShortcutsRegistry>,
): ShortcutsRegistry => {
  if (groupCondition) {
    Object.values(shortcuts).forEach((shortcut) => {
      const itemCondition = shortcut.condition;
      if (itemCondition) {
        shortcut.condition = () => groupCondition() && itemCondition();
      } else {
        shortcut.condition = groupCondition;
      }
    });
  }

  return shortcuts as ShortcutsRegistry;
};

const shortcuts: ShortcutsRegistry = {
  ...applicationShortcuts,
  ...conditionGroup(
    // Enabled if workflow is present
    () => Boolean(useWorkflowStore().activeWorkflow),
    {
      ...workflowShortcuts,
      ...nodeAlignShortcuts,
      ...annotationShortcuts,
      ...componentOrMetanodeShortcuts,
      ...conditionGroup(
        () => useUIControlsStore().canEditWorkflow,
        executionShortcuts,
      ),
      ...conditionGroup(
        () => Boolean(useCurrentCanvasStore().value.interactionsEnabled),
        selectionShortcuts,
      ),
      ...conditionGroup(
        () =>
          Boolean(
            useCurrentCanvasStore().value.interactionsEnabled &&
              !useWorkflowStore().isWorkflowEmpty,
          ),
        canvasShortcuts,
      ),
    },
  ),
  ...sidePanelShortcuts,
  ...uiScaleShortcuts,
};

export default shortcuts;
export * from "./types";
