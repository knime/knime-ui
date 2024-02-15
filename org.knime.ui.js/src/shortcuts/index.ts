import { isDesktop } from "@/environment";

import executionShortcuts, {
  type ExecutionShortcuts,
} from "./executionShortcuts";

import { canvasShortcuts, type CanvasShortcuts } from "./canvasShortcuts";

import {
  applicationShortcuts,
  type ApplicationShortcuts,
} from "./applicationShortcuts";

import {
  selectionShortcuts,
  type SelectionShortcuts,
  sidePanelShortcuts,
  type SidePanelShortcuts,
} from "./miscShortcuts";

import { type WorkflowShortcuts, workflowShortcuts } from "./workflow";
import { conditionGroup } from "./util";

export type ShortcutsRegistry = ApplicationShortcuts &
  WorkflowShortcuts &
  ExecutionShortcuts &
  SelectionShortcuts &
  SidePanelShortcuts &
  CanvasShortcuts;

const shortcuts: ShortcutsRegistry = {
  ...conditionGroup(() => isDesktop, applicationShortcuts),
  ...conditionGroup(
    // Enabled if workflow is present
    ({ $store }) => Boolean($store.state.workflow.activeWorkflow),
    {
      ...workflowShortcuts,
      ...executionShortcuts,
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
