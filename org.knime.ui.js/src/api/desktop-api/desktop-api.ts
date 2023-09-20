/* eslint-disable max-lines */
import { environment } from "@/environment";

import type {
  SpaceProviderId,
  SpaceId,
  FullSpacePath,
  SpaceItemId,
  SpaceProviderNS,
} from "../custom-types";

const callBrowserFunction = <TFunction extends (...args: any[]) => any>(
  browserFunction: TFunction,
  params: Parameters<TFunction>,
  messageOnError: string,
  returnsValue: boolean,
): ReturnType<TFunction> => {
  if (environment === "BROWSER") {
    return null;
  }

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
    if (returnsValue) {
      return null;
    } else {
      throw e;
    }
  }
};

export const switchToJavaUI = () => {
  callBrowserFunction(
    window.switchToJavaUI,
    [],
    "Could not switch to classic UI",
    false,
  );
};

export const switchWorkspace = () => {
  callBrowserFunction(
    window.switchWorkspace,
    [],
    "Could not switch workspace",
    false,
  );
};

export const openAboutDialog = () => {
  callBrowserFunction(
    window.openAboutDialog,
    [],
    "Could not open about dialog",
    false,
  );
};

export const openUpdateDialog = () => {
  callBrowserFunction(
    window.openUpdateDialog,
    [],
    "Could not open update dialog",
    false,
  );
};

export const checkForUpdates = () => {
  callBrowserFunction(
    window.checkForUpdates,
    [],
    "Could not check for updates",
    false,
  );
};

export const openUrlInExternalBrowser = ({ url }: { url: string }) => {
  callBrowserFunction(
    window.openUrlInExternalBrowser,
    [url],
    "Could not open URL in External Browser",
    false,
  );
};

export const openWebUIPreferencePage = () => {
  callBrowserFunction(
    window.openWebUIPreferencePage,
    [],
    "Could not open preferences",
    false,
  );
};

export const openInstallExtensionsDialog = () => {
  callBrowserFunction(
    window.openInstallExtensionsDialog,
    [],
    "Could not open install extensions dialog",
    false,
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
    false,
  );
};

export const openLinkComponentDialog = ({
  projectId,
  workflowId,
  nodeId,
}: {
  projectId: string;
  workflowId: string;
  nodeId: string;
}) => {
  return callBrowserFunction(
    window.openLinkComponentDialog,
    [projectId, workflowId, nodeId],
    `Could not open linking dialog of component ${nodeId}`,
    true,
  );
};

export const updateComponent = ({
  projectId,
  workflowId,
  nodeId,
}: {
  projectId: string;
  workflowId: string;
  nodeId: string;
}) => {
  callBrowserFunction(
    window.updateComponent,
    [projectId, workflowId, nodeId],
    `Could not update component ${nodeId}`,
    false,
  );
};

export const openChangeComponentHubItemVersionDialog = ({
  projectId,
  workflowId,
  nodeId,
}: {
  projectId: string;
  workflowId: string;
  nodeId: string;
}) => {
  callBrowserFunction(
    window.openChangeComponentHubItemVersionDialog,
    [projectId, workflowId, nodeId],
    `Could not change Hub item version of component ${nodeId}`,
    false,
  );
};

export const openChangeComponentLinkTypeDialog = ({
  projectId,
  workflowId,
  nodeId,
}: {
  projectId: string;
  workflowId: string;
  nodeId: string;
}) => {
  callBrowserFunction(
    window.openChangeComponentLinkTypeDialog,
    [projectId, workflowId, nodeId],
    `Could not change link type of component ${nodeId}`,
    false,
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
    false,
  );
};

export const openLegacyPortView = ({
  projectId,
  nodeId,
  portIdx,
  executeNode,
}: {
  projectId: string;
  nodeId: string;
  portIdx: number;
  executeNode: boolean;
}) => {
  callBrowserFunction(
    window.openLegacyPortView,
    [projectId, nodeId, portIdx, executeNode],
    `Could not execute and open view of node ${nodeId}`,
    false,
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
    false,
  );
};

export const openPortView = ({
  projectId,
  nodeId,
  portIndex,
  viewIndex,
}: {
  projectId: string;
  nodeId: string;
  portIndex: number;
  viewIndex: number;
}) => {
  callBrowserFunction(
    window.openPortView,
    [projectId, nodeId, portIndex, viewIndex],
    `Could not open detached view for node ${nodeId} and port #${portIndex}`,
    false,
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
    false,
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
    false,
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
    true,
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
    true,
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
    false,
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
    false,
  );
};

export const openWorkflowCoachPreferencePage = () => {
  callBrowserFunction(
    window.openWorkflowCoachPreferencePage,
    [],
    "Could not open workflow coach preference page",
    false,
  );
};

export const getSpaceProviders = () => {
  callBrowserFunction(
    window.getSpaceProviders,
    [],
    "Could not fetch space providers",
    false,
  );
};

export const connectSpaceProvider = ({
  spaceProviderId,
}: SpaceProviderId): SpaceProviderNS.SpaceProvider => {
  const user = callBrowserFunction(
    window.connectSpaceProvider,
    [spaceProviderId],
    `Could not connect to provider ${spaceProviderId}`,
    true,
  );

  return JSON.parse(user);
};

export const disconnectSpaceProvider = ({
  spaceProviderId,
}: SpaceProviderId) => {
  callBrowserFunction(
    window.disconnectSpaceProvider,
    [spaceProviderId],
    `Could not disconnect from provider ${spaceProviderId}`,
    false,
  );
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
    true,
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
    true,
  );
};

export const exportSpaceItem = ({
  spaceProviderId = "local",
  spaceId = "local",
  itemId,
}: FullSpacePath) => {
  return callBrowserFunction(
    window.exportSpaceItem,
    [spaceProviderId, spaceId, itemId],
    "Could not export item",
    true,
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
    true,
  );
};

export const copyBetweenSpaces = ({
  spaceProviderId = "local",
  spaceId = "local",
  itemIds,
}: SpaceProviderId & SpaceId & { itemIds: string[] }) => {
  return callBrowserFunction(
    window.copyBetweenSpaces,
    [spaceProviderId, spaceId, itemIds],
    "Error uploading to Hub space",
    true,
  );
};

export const openInBrowser = ({
  spaceProviderId,
  spaceId,
  itemId,
}: SpaceProviderId & SpaceId & { itemId: string }) => {
  return callBrowserFunction(
    window.openInBrowser,
    [spaceProviderId, spaceId, itemId],
    "Error opening in browser",
    false,
  );
};

export const openAPIDefinition = ({
  spaceProviderId,
  spaceId,
  itemId,
}: SpaceProviderId & SpaceId & { itemId: string }) => {
  return callBrowserFunction(
    window.openAPIDefinition,
    [spaceProviderId, spaceId, itemId],
    "Error opening in Hub",
    false,
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
    false,
  );
};

export const saveAndCloseWorkflows = ({
  totalProjects,
  projectIds,
  svgSnapshots,
  params,
}: {
  totalProjects: number;
  projectIds: string[];
  svgSnapshots: string[];
  params: any[];
}) => {
  callBrowserFunction(
    window.saveAndCloseWorkflows,
    [totalProjects, ...projectIds, ...svgSnapshots, ...params],
    "Could not save and close all workflows",
    false,
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
    true,
  );
};

export const importURIAtWorkflowCanvas = ({
  uri,
  projectId,
  workflowId,
  x,
  y,
}: {
  uri: string | null;
  projectId: string;
  workflowId: string;
  x: number;
  y: number;
}) => {
  return callBrowserFunction(
    window.importURIAtWorkflowCanvas,
    [uri, projectId, workflowId, x, y],
    `Could not import URI at canvas position (${x}, ${y})`,
    false,
  );
};

export const abortAiRequest = ({ conversationId, chainType }) => {
  return callBrowserFunction(
    window.abortAiRequest,
    [conversationId, chainType],
    "Could not abort AI request",
    false,
  );
};

export const makeAiRequest = ({
  conversationId,
  chainType,
  projectId,
  workflowId,
  nodeId,
  messages,
}) => {
  return callBrowserFunction(
    window.makeAiRequest,
    [
      conversationId,
      chainType,
      projectId,
      workflowId,
      nodeId,
      JSON.stringify(messages),
    ],
    "Could not make AI request",
    false,
  );
};

export const isAiAssistantBackendAvailable = () => {
  return callBrowserFunction(
    window.isAiAssistantBackendAvailable,
    [],
    "Could not open workflow coach preference page",
    true,
  );
};

export const getAiServerAddress = () => {
  return callBrowserFunction(
    window.getAiServerAddress,
    [],
    "Could not get AI server address",
    true,
  );
};

export const getHubID = () => {
  return callBrowserFunction(window.getHubID, [], "Could not get hub id", true);
};

export const openPermissionsDialog = ({
  spaceProviderId,
  spaceId,
  itemId,
}: SpaceProviderId & SpaceId & SpaceItemId) => {
  return callBrowserFunction(
    window.openPermissionsDialog,
    [spaceProviderId, spaceId, itemId],
    "Could not open server permission dialog",
    false,
  );
};

export const executeWorkflow = ({
  spaceProviderId,
  spaceId,
  itemId,
}: SpaceProviderId & SpaceId & SpaceItemId) => {
  return callBrowserFunction(
    window.executeOnClassic,
    [spaceProviderId, spaceId, itemId],
    "Could not remote execute workflow",
    false,
  );
};

export const saveJobAsWorkflow = ({
  spaceProviderId,
  spaceId,
  itemId,
  jobId,
  jobName,
}: SpaceProviderId &
  SpaceId &
  SpaceItemId & { jobId: string; jobName: string }) => {
  return callBrowserFunction(
    window.saveJobAsWorkflow,
    [spaceProviderId, spaceId, itemId, jobId, jobName],
    "Could not save job as workflow",
    true,
  );
};

export const editSchedule = ({
  spaceProviderId,
  spaceId,
  itemId,
  scheduleId,
}: SpaceProviderId & SpaceId & SpaceItemId & { scheduleId: string }) => {
  return callBrowserFunction(
    window.editSchedule,
    [spaceProviderId, spaceId, itemId, scheduleId],
    "Could not edit schedule",
    true,
  );
};
