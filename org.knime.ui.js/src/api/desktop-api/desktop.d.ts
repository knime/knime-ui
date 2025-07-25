declare function switchToJavaUI(): void;
declare function switchWorkspace(): void;
declare function openAboutDialog(): void;
declare function openUpdateDialog(): void;
declare function openKNIMEHomeDir(): void;
declare function checkForUpdates(): void;
declare function openUrlInExternalBrowser(url: string): void;
declare function openInstallExtensionsDialog(): void;
declare function openWebUIPreferencePage(): void;
declare function openNodeDialog(
  projectId: string,
  versionId: string,
  nodeId: string,
): boolean;

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
  allowOverwritePrompt?: boolean,
): boolean;

declare function openProject(
  spaceId: string,
  itemId: string,
  spaceProviderId: string,
): void;

declare function closeProject(
  closingProjectId: string,
  nextProjectId: string | null,
): boolean;

declare function forceCloseProjects(...args: string[]): void;

declare function setProjectActiveAndEnsureItsLoaded(
  projectId: string,
  versionId: string,
  // TODO NXT-3867: solution will be superseded by workflow load error handling
  removeProjectIfNotLoaded: boolean,
): boolean;

declare function openLayoutEditor(
  projectId: string,
  workflowId: string,
): string;

declare function openWorkflowCoachPreferencePage(): void;

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
  usageContext: string,
): "OVERWRITE" | "NOOP" | "AUTORENAME" | "CANCEL";

declare function downloadFromSpace(
  sourceProviderId: string,
  sourceSpaceId: string,
  sourceItemIds: string[],
  destinationProviderId: string,
  destinationSpaceId: string,
  destinationItemId: string,
): boolean;

declare function uploadToSpace(
  sourceProviderId: string,
  sourceSpaceId: string,
  sourceItemIds: string[],
  destinationProviderId: string,
  destinationSpaceId: string,
  destinationItemId: string,
  excludeData: boolean,
): string[];

declare function openInBrowser(
  spaceProviderId: string,
  spaceId: string,
  itemId: string,
  queryString?: string,
): void;

declare function openAPIDefinition(
  spaceProviderId: string,
  spaceId: string,
  itemId: string,
): void;

declare function saveProjectAs(projectId: string): void;

declare function importURIAtWorkflowCanvas(
  uri: string | null,
  projectId: string,
  worflowId: string,
  x: number,
  y: number,
): void;

declare function importComponent(
  spaceProviderId: string,
  spaceId: string,
  itemId: string,
  projectId: string,
  workflowId: string,
  x: number,
  y: number,
): string | null;

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

declare function setZoomLevel(zoomLevel: number): void;

declare function setConfirmNodeConfigChangesPreference(value: boolean): void;

declare function updateAndGetMostRecentlyUsedProjects(): string;

declare function removeMostRecentlyUsedProject(
  spaceProviderId: string,
  spaceId: string,
  itemId: string,
): void;

declare function updateMostRecentlyUsedProject(
  spaceProviderId: string,
  spaceId: string,
  itemId: string,
  newName?: string,
): void;

declare function getCustomHelpMenuEntries(): Record<string, string>;

declare function openLockSubnodeDialog(projectId: string, nodeId: string): void;

declare function unlockSubnode(projectId: string, nodeId: string): boolean;

declare function getHomePageTile(): Record<string, string>;

declare function getExampleProjects(): string;

declare function getAncestorInfo(
  providerId: string,
  spaceId: string,
  itemId: string,
): string;

declare function updateOpenProjectsOrder(...args: string[]): void;

declare function getUserProfilePart(key: string): any;
declare function setUserProfilePart(key: string, data: any): void;
