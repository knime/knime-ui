import type { WorkflowState } from "./workflow";
import type { SpacesState } from "./spaces";
import type { AiAssistantState } from "./aiAssistant";
import type { ApplicationState } from "./application";
import type { SelectionState } from "./selection";

export interface RootStoreState {
  application: ApplicationState;
  canvas: any;
  nodeRepository: any;
  panel: any;
  selection: SelectionState;
  workflow: WorkflowState;
  spaces: SpacesState;
  quickAddNodes: any;
  aiAssistant: AiAssistantState;
}
