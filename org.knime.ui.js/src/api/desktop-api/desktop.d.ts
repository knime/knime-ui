declare function switchToJavaUI(): void;
declare function switchWorkspace(): void;
declare function openAboutDialog(): void;
declare function openUpdateDialog(): void;
declare function openUrlInExternalBrowser(url: string): void;
declare function openInstallExtensionsDialog(): void;
declare function openWebUIPreferencePage(): void;
declare function openNodeDialog(projectId: string, nodeId: string): void;

declare function openLegacyFlowVariableDialog(
  projectId: string,
  nodeId: string,
): void;

declare function executeNodeAndOpenView(
  projectId: string,
  nodeId: string,
): void;

declare function executeNodeAndOpenLegacyPortView(
  projectId: string,
  nodeId: string,
  portIdx: number,
): void;

declare function openPortView(
  projectId: string,
  nodeId: string,
  portIndex: number,
  viewIndex: number,
): void;

declare function saveWorkflow(
  projectId: string,
  workflowPreviewSvg: string,
): void;

declare function openWorkflow(
  spaceId: string,
  itemId: string,
  spaceProviderId: string,
): void;

declare function closeWorkflow(
  closingProjectId: string,
  nextProjectId: string,
): boolean;

declare function forceCloseWorkflows(...args: string[]): boolean;

declare function setProjectActiveAndEnsureItsLoaded(projectId: string): void;

declare function openLayoutEditor(
  projectId: string,
  workflowId: string,
): string;

declare function openWorkflowCoachPreferencePage(): void;

declare function getSpaceProviders(): void;
declare function connectSpaceProvider(spaceProviderId: string): string;
declare function disconnectSpaceProvider(spaceProviderId: string): void;

declare function importFiles(
  spaceProviderId: string,
  spaceId: string,
  itemId: string,
): boolean;

declare function importWorkflows(
  spaceProviderId: string,
  spaceId: string,
  itemId: string,
): boolean;

declare function exportSpaceItem(
  spaceProviderId: string,
  spaceId: string,
  itemId: string,
): boolean;

declare function getNameCollisionStrategy(
  spaceProviderId: string,
  spaceId: string,
  itemIds: string[],
  destinationItemId: string,
): "OVERWRITE" | "NOOP" | "AUTORENAME" | "CANCEL";

declare function copyBetweenSpaces(
  spaceProviderId: string,
  spaceId: string,
  itemIds: string[],
): boolean;

declare function openInHub(
  spaceProviderId: string,
  spaceId: string,
  itemId: string,
): void;

declare function saveWorkflowAs(
  projectId: string,
  workflowPreviewSvg: string,
): void;

declare function saveAndCloseWorkflows(
  totalProjects: number,
  ...args: unknown[]
): unknown;

declare function importURIAtWorkflowCanvas(
  uri: string | null,
  projectId: string,
  worflowId: string,
  x: number,
  y: number,
): unknown;

declare function importComponent(
  spaceProviderId: string,
  spaceId: string,
  itemId: string,
  projectId: string,
  workflowId: string,
  x: number,
  y: number,
): string | null;

declare function makeAiRequest(
  chainType: string,
  projectId: string,
  workflowId: string,
  nodeId: string,
  messages: string,
): void;

declare function abortAiRequest(chainType: string): void;
declare function isAiAssistantBackendAvailable(): boolean;
declare function getAiServerAddress(): string;
declare function getHubID(): string;

declare function openPermissionsDialog(
  spaceProviderId: string,
  spaceId: string,
  itemId: string,
): void;
