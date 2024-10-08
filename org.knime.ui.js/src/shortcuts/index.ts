import annotationShortcuts from "./annotationShortcuts";
import applicationShortcuts from "./applicationShortcuts";
import canvasShortcuts from "./canvasShortcuts";
import componentOrMetanodeShortcuts from "./componentOrMetanodeShortcuts";
import executionShortcuts from "./executionShortcuts";
import { selectionShortcuts, sidePanelShortcuts } from "./miscShortcuts";
import type { ShortcutConditionContext } from "./types";
import workflowShortcuts from "./workflowShortcuts";

// This interface will be enhanced and extended by the
// other files which also declare shortcuts
export interface ShortcutsRegistry {}

// chains a group condition before each individual shortcut condition
// exported for testing purposes
export const conditionGroup = (
  groupCondition: (payload: ShortcutConditionContext) => boolean,
  shortcuts: Partial<ShortcutsRegistry>,
): ShortcutsRegistry => {
  if (groupCondition) {
    Object.values(shortcuts).forEach((shortcut) => {
      const itemCondition = shortcut.condition;
      if (itemCondition) {
        shortcut.condition = (...args) =>
          groupCondition(...args) && itemCondition(...args);
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
    ({ $store }) => Boolean($store.state.workflow.activeWorkflow),
    {
      ...workflowShortcuts,
      ...annotationShortcuts,
      ...componentOrMetanodeShortcuts,
      ...conditionGroup(
        ({ $store }) => $store.state.uiControls.canEditWorkflow,
        executionShortcuts,
      ),
      ...conditionGroup(
        ({ $store }) => Boolean($store.state.canvas.interactionsEnabled),
        selectionShortcuts,
      ),
      ...conditionGroup(
        ({ $store }) =>
          Boolean(
            $store.state.canvas.interactionsEnabled &&
              !$store.getters["workflow/isWorkflowEmpty"],
          ),
        canvasShortcuts,
      ),
    },
  ),
  ...sidePanelShortcuts,
};

export default shortcuts;
export * from "./types";
