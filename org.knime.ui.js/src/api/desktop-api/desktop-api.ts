import type {
  SpaceProviderId,
  SpaceId,
  FullSpacePath,
  SpaceProvider,
  SpaceItemId,
  SpaceUser,
} from "../custom-types";

const callBrowserFunction = <TFunction extends (...args: any[]) => any>(
  browserFunction: TFunction,
  params: Parameters<TFunction>,
  messageOnError: string,
  returnsValue: boolean
): ReturnType<TFunction> => {
  try {
    const resultOrError = browserFunction(...params);

    if (returnsValue) {
      return resultOrError;
    }

    if (!returnsValue && resultOrError) {
      throw new Error(resultOrError);
    }

    return null;
  } catch (e) {
    consola.error(messageOnError, e);
    return null;
  }
};

export const switchToJavaUI = () => {
  callBrowserFunction(
    window.switchToJavaUI,
    [],
    "Could not switch to classic UI",
    false
  );
};

export const openAboutDialog = () => {
  callBrowserFunction(
    window.openAboutDialog,
    [],
    "Could not open about dialog",
    false
  );
};

export const openUpdateDialog = () => {
  callBrowserFunction(
    window.openUpdateDialog,
    [],
    "Could not open update dialog",
    false
  );
};

export const openUrlInExternalBrowser = () => {
  callBrowserFunction(
    window.openUrlInExternalBrowser,
    [],
    "Could not open URL in External Browser",
    false
  );
};

export const openKnimeUIPreferences = () => {
  callBrowserFunction(
    window.openWebUIPreferencePage,
    [],
    "Could not open preferences",
    false
  );
};

export const openInstallExtensionsDialog = () => {
  callBrowserFunction(
    window.openInstallExtensionsDialog,
    [],
    "Could not open install extensions dialog",
    false
  );
};

export const openNodeDialog = ({
  projectId,
  nodeId,
}: {
  projectId: string;
  nodeId: string;
}) => {
  callBrowserFunction(
    window.openNodeDialog,
    [projectId, nodeId],
    `Could not open dialog of node ${nodeId}`,
    false
  );
};

export const openLegacyFlowVariableDialog = ({
  projectId,
  nodeId,
}: {
  projectId: string;
  nodeId: string;
}) => {
  callBrowserFunction(
    window.openLegacyFlowVariableDialog,
    [projectId, nodeId],
    `Could not open legacy flow variable dialog of node ${nodeId}`,
    false
  );
};

export const executeNodeAndOpenView = ({
  projectId,
  nodeId,
}: {
  projectId: string;
  nodeId: string;
}) => {
  callBrowserFunction(
    window.executeNodeAndOpenView,
    [projectId, nodeId],
    `Could not execute and open view of node ${nodeId}`,
    false
  );
};

export const saveWorkflow = ({
  projectId,
  workflowPreviewSvg,
}: {
  projectId: string;
  workflowPreviewSvg: string;
}) => {
  callBrowserFunction(
    window.saveWorkflow,
    [projectId, workflowPreviewSvg],
    "Could not save workflow",
    false
  );
};

export const openWorkflow = ({
  spaceId = "local",
  itemId,
  spaceProviderId = "local",
}: FullSpacePath) => {
  callBrowserFunction(
    window.openWorkflow,
    [spaceId, itemId, spaceProviderId],
    "Could not open workflow",
    false
  );
};

export const closeWorkflow = ({
  closingProjectId,
  nextProjectId,
}: {
  closingProjectId: string;
  nextProjectId: string;
}) => {
  return callBrowserFunction(
    window.closeWorkflow,
    [closingProjectId, nextProjectId],
    "Could not close workflow",
    true
  );
};

export const forceCloseWorkflows = ({
  projectIds,
}: {
  projectIds: Array<string>;
}) => {
  return callBrowserFunction(
    window.forceCloseWorkflows,
    projectIds,
    "Could not close workflow",
    true
  );
};

export const setProjectActiveAndEnsureItsLoaded = ({
  projectId,
}: {
  projectId: string;
}) => {
  callBrowserFunction(
    window.setProjectActiveAndEnsureItsLoaded,
    [projectId],
    "Failed to set project as active in the backend",
    false
  );
};

export const openLayoutEditor = ({
  projectId,
  workflowId,
}: {
  projectId: string;
  workflowId: string;
}) => {
  callBrowserFunction(
    window.openLayoutEditor,
    [projectId, workflowId],
    "Could not open layout editor",
    true
  );
};

export const openWorkflowCoachPreferencePage = () => {
  callBrowserFunction(
    window.openWorkflowCoachPreferencePage,
    [],
    "Could not open workflow coach preference page",
    false
  );
};

export const fetchAllSpaceProviders = (): Promise<
  Record<string, SpaceProvider>
> => {
  const spaceProviders = callBrowserFunction(
    window.getSpaceProviders,
    [],
    "Could not fetch space providers",
    true
  );

  return Promise.resolve(JSON.parse(spaceProviders));
};

export const connectSpaceProvider = ({
  spaceProviderId,
}: SpaceProviderId): SpaceUser => {
  const user = callBrowserFunction(
    window.connectSpaceProvider,
    [spaceProviderId],
    `Could not connect to provider ${spaceProviderId}`,
    true
  );

  return JSON.parse(user);
};

export const disconnectSpaceProvider = ({
  spaceProviderId,
}: SpaceProviderId): Promise<SpaceUser> => {
  const user = callBrowserFunction(
    window.disconnectSpaceProvider,
    [spaceProviderId],
    `Could not disconnect from provider ${spaceProviderId}`,
    true
  );

  return Promise.resolve(JSON.parse(user));
};

export const importFiles = ({
  spaceProviderId = "local",
  spaceId = "local",
  itemId,
}: FullSpacePath) => {
  return callBrowserFunction(
    window.importFiles,
    [spaceProviderId, spaceId, itemId],
    "Could not disconnect import files",
    true
  );
};

export const importWorkflows = ({
  spaceProviderId = "local",
  spaceId = "local",
  itemId,
}: FullSpacePath) => {
  return callBrowserFunction(
    window.importWorkflows,
    [spaceProviderId, spaceId, itemId],
    "Could not import workflows",
    true
  );
};

export const getNameCollisionStrategy = ({
  spaceProviderId = "local",
  spaceId = "local",
  itemIds,
  destinationItemId,
}: SpaceProviderId &
  SpaceId & { itemIds: string[]; destinationItemId: string }) => {
  return callBrowserFunction(
    window.getNameCollisionStrategy,
    [spaceProviderId, spaceId, itemIds, destinationItemId],
    "Could not check for name collisions",
    true
  );
};

export const copyBetweenSpaces = ({
  spaceProviderId = "local",
  spaceId = "local",
  itemIds,
}: SpaceProviderId & SpaceId & { itemIds: string[] }) => {
  callBrowserFunction(
    window.copyBetweenSpaces,
    [spaceProviderId, spaceId, itemIds],
    "Error uploading to Hub space",
    false
  );
};

export const saveWorkflowAs = ({
  projectId,
  workflowPreviewSvg,
}: {
  projectId: string;
  workflowPreviewSvg: string;
}) => {
  callBrowserFunction(
    window.saveWorkflowAs,
    [projectId, workflowPreviewSvg],
    "Could not save workflow locally",
    false
  );
};

export const importComponent = ({
  spaceProviderId,
  spaceId,
  itemId,
  projectId,
  workflowId,
  x,
  y,
}: SpaceProviderId &
  SpaceId &
  SpaceItemId & {
    projectId: string;
    workflowId: string;
    x: number;
    y: number;
  }) => {
  return callBrowserFunction(
    window.importComponent,
    [spaceProviderId, spaceId, itemId, projectId, workflowId, x, y],
    "Could not import component",
    true
  );
};
