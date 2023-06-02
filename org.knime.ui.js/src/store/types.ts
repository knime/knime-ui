import type { WorkflowState } from "./workflow";

export interface RootStoreState {
  application: any;
  canvas: any;
  nodeRepository: any;
  panel: any;
  selection: any;
  workflow: WorkflowState;
  spaces: any;
  quickAddNodes: any;
}
