import devModeShortcuts from "./devModeShortcuts";
import generalWorkflowShortcuts from "./generalShortcuts";
import otherWorkflowShortcuts from "./otherWorkflowShortcuts";
import selectedNodeWorkflowShortcuts from "./selectedNodeShortcuts";
import workflowEditorShortcuts from "./workflowEditorShortcuts";

const workflowShortcuts = {
  ...devModeShortcuts,
  ...generalWorkflowShortcuts,
  ...otherWorkflowShortcuts,
  ...selectedNodeWorkflowShortcuts,
  ...workflowEditorShortcuts,
};

type WorkflowShortcuts = typeof workflowShortcuts;

declare module "../index" {
  interface ShortcutsRegistry extends WorkflowShortcuts {}
}

export default workflowShortcuts;
