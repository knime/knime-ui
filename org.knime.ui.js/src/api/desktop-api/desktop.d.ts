declare function switchToJavaUI(): void;
declare function openAboutDialog(): void;
declare function openUpdateDialog(): void;
declare function openUrlInExternalBrowser(): void;
declare function openInstallExtensionsDialog(): void;
declare function openWebUIPreferencePage(): void;
declare function openNodeDialog(
  projectId: string,
  nodeId: string
): string | undefined;

declare function openLegacyFlowVariableDialog(
  projectId: string,
  nodeId: string
): string | undefined;

declare function executeNodeAndOpenView(
  projectId: string,
  nodeId: string
): void;

declare function saveWorkflow(
  projectId: string,
  workflowPreviewSvg: string
): string | undefined;

declare function openWorkflow(
  spaceId: string,
  itemId: string,
  spaceProviderId: string
): string | undefined;

declare function closeWorkflow(
  closingProjectId: string,
  nextProjectId: string
): boolean;

declare function forceCloseWorkflows(...args: string[]): boolean;

declare function setProjectActiveAndEnsureItsLoaded(projectId: string): void;

declare function openLayoutEditor(projectId: string, workflowId: string): void;

declare function openWorkflowCoachPreferencePage(): string | undefined;

declare function getSpaceProviders(): string;
declare function connectSpaceProvider(spaceProviderId: string): string;
declare function disconnectSpaceProvider(spaceProviderId: string): string;

declare function importFiles(
  spaceProviderId: string,
  spaceId: string,
  itemId: string
): string | null;

declare function importWorkflows(
  spaceProviderId: string,
  spaceId: string,
  itemId: string
): string | null;

declare function getNameCollisionStrategy(
  spaceProviderId: string,
  spaceId: string,
  itemIds: string[],
  destinationItemId: string
): "OVERWRITE" | "NOOP" | "AUTORENAME" | "CANCEL";

declare function copyBetweenSpaces(
  spaceProviderId: string,
  spaceId: string,
  itemIds: string[]
): void;

declare function saveWorkflowAs(
  projectId: string,
  workflowPreviewSvg: string
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
  y: number
): unknown;

declare function importComponent(
  spaceProviderId: string,
  spaceId: string,
  itemId: string,
  projectId: string,
  workflowId: string,
  x: number,
  y: number
): string | null;
