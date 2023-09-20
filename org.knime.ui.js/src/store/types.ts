import type { WorkflowState } from "./workflow";
import type { SpacesState } from "./spaces";
import type { AiAssistantState } from "./aiAssistant";
import type { ApplicationState } from "./application";
import type { SelectionState } from "./selection";
import type { PanelState } from "./panel";
import type { NodeRepositoryState } from "./nodeRepository";
import type { QuickAddNodesState } from "./quickAddNodes";

export interface RootStoreState {
  application: ApplicationState;
  canvas: any;
  nodeRepository: NodeRepositoryState;
  panel: PanelState;
  selection: SelectionState;
  workflow: WorkflowState;
  spaces: SpacesState;
  quickAddNodes: QuickAddNodesState;
  aiAssistant: AiAssistantState;
}
