import type { WorkflowState } from "./workflow";
import type { SpacesState } from "./spaces";

export interface RootStoreState {
  application: any;
  canvas: any;
  nodeRepository: any;
  panel: any;
  selection: any;
  workflow: WorkflowState;
  spaces: SpacesState;
  quickAddNodes: any;
}
