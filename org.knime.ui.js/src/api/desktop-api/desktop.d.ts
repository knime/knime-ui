declare function switchToJavaUI(): void;
declare function switchWorkspace(): void;
declare function openAboutDialog(): void;
declare function openUpdateDialog(): void;
declare function openKNIMEHomeDir(): void;
declare function checkForUpdates(): void;
declare function openUrlInExternalBrowser(url: string): void;
declare function openInstallExtensionsDialog(): void;
declare function openWebUIPreferencePage(): void;
declare function openNodeDialog(projectId: string, nodeId: string): void;

declare function openLinkComponentDialog(
  projectId: string,
  workflowId: string,
  nodeId: string,
): boolean;

declare function openChangeComponentHubItemVersionDialog(
  projectId: string,
  workflowId: string,
  nodeId: string,
): void;

declare function openChangeComponentLinkTypeDialog(
  projectId: string,
  workflowId: string,
  nodeId: string,
): void;

declare function openLegacyFlowVariableDialog(
  projectId: string,
  nodeId: string,
): void;

declare function executeNodeAndOpenView(
  projectId: string,
  nodeId: string,
): void;

declare function openLegacyPortView(
  projectId: string,
  nodeId: string,
  portIdx: number,
  executeNode: boolean,
): void;

declare function openPortView(
  projectId: string,
  nodeId: string,
  portIndex: number,
  viewIndex: number,
): void;

declare function saveProject(
  projectId: string,
  workflowPreviewSvg: string | null,
): void;

declare function openProject(
  spaceId: string,
  itemId: string,
  spaceProviderId: string,
): void;

declare function closeProject(
  closingProjectId: string,
  nextProjectId: string | null,
): boolean;

declare function forceCloseProjects(...args: string[]): boolean;

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
): Array<string> | null;

declare function importWorkflows(
  spaceProviderId: string,
  spaceId: string,
  itemId: string,
): Array<string> | null;

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

declare function moveOrCopyToSpace(
  spaceProviderId: string,
  spaceId: string,
  isCopy: boolean,
  itemIds: string[],
): boolean;

declare function openInBrowser(
  spaceProviderId: string,
  spaceId: string,
  itemId: string,
): void;

declare function openAPIDefinition(
  spaceProviderId: string,
  spaceId: string,
  itemId: string,
): void;

declare function saveProjectAs(
  projectId: string,
  workflowPreviewSvg: string | null,
): void;

declare function saveAndCloseProjects(
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
  conversationId: string | null,
  chainType: string,
  projectId: string,
  workflowId: string,
  selectedNodes: string[],
  messages: string,
): void;

declare function abortAiRequest(
  conversationId: string | null,
  chainType: string,
): void;
declare function getUiStrings(): string;
declare function installKAI(): void;
declare function getHubID(): string;
declare function openAiAssistantPreferencePage(): void;

declare function openPermissionsDialog(
  spaceProviderId: string,
  spaceId: string,
  itemId: string,
): void;

declare function saveJobAsWorkflow(
  spaceProviderId: string,
  spaceId: string,
  itemId: string,
  jobId: string,
  jobName: string,
): string;

declare function executeOnClassic(
  spaceProviderId: string,
  spaceId: string,
  itemId: string,
): void;

declare function editSchedule(
  spaceProviderId: string,
  spaceId: string,
  itemId: string,
  scheduleId: string,
): string;

declare function openWorkflowConfiguration(projectId: string): void;
