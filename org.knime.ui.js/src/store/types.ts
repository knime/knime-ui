import type { AiAssistantState } from "./aiAssistant";
import type { ApplicationState } from "./application";
import type { CanvasState } from "./canvas";
import type { NodeConfigurationState } from "./nodeConfiguration";
import type { NodeDescriptionState } from "./nodeDescription";
import type { NodeRepositoryState } from "./nodeRepository";
import type { NodeTemplatesState } from "./nodeTemplates";
import type { PanelState } from "./panel";
import type { QuickAddNodesState } from "./quickAddNodes";
import type { SelectionState } from "./selection";
import type { SettingsState } from "./settings";
import type { SpacesState } from "./spaces";
import type { UIControlsState } from "./uiControls";
import type { WorkflowState } from "./workflow";
import type { WorkflowMonitorState } from "./workflowMonitor";

export interface RootStoreState {
  application: ApplicationState;
  canvas: CanvasState;
  nodeRepository: NodeRepositoryState;
  panel: PanelState;
  selection: SelectionState;
  workflow: WorkflowState;
  spaces: SpacesState;
  quickAddNodes: QuickAddNodesState;
  aiAssistant: AiAssistantState;
  settings: SettingsState;
  nodeConfiguration: NodeConfigurationState;
  workflowMonitor: WorkflowMonitorState;
  nodeTemplates: NodeTemplatesState;
  nodeDescription: NodeDescriptionState;
  uiControls: UIControlsState;
}
