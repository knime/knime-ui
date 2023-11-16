/* eslint-disable max-lines */
import { environment } from "@/environment";
import { $bus } from "@/plugins/event-bus";

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
  blockUi: { block: boolean; darkenBackground?: boolean },
  // eslint-disable-next-line max-params
): Promise<ReturnType<TFunction> | null> => {
  if (environment === "BROWSER") {
    return null;
  }

  try {
    // register for events
    const result = new Promise<ReturnType<TFunction>>((resolve, reject) => {
      // 'forwarded' backend event from events.ts
      $bus.on(
        `desktop-api-function-result-${browserFunction.name}`,
        (result: string | boolean) => {
          $bus.off(`desktop-api-function-result-${browserFunction.name}`);
          // unblock UI (if it was blocked) when the desktop function has returned (which is indicated by this event)
          if (blockUi.block) {
            $bus.emit("desktop-api-function-block-ui", { block: false });
          }
          // consider the result an error if we got one even for void functions
          if (!returnsValue && result) {
            reject(result);
          }
          resolve(result as ReturnType<TFunction>);
        },
      );
    });

    if (blockUi.block) {
      $bus.emit("desktop-api-function-block-ui", {
        block: true,
        darkenBackground: blockUi.darkenBackground,
      });
    }
    // call the async browserFunction
    browserFunction(...params);
    return result;
  } catch (e) {
    consola.error(messageOnError, e);
    if (returnsValue) {
      return Promise.resolve(null);
    } else {
      throw e;
    }
  }
};

export const switchToJavaUI = () => {
  return callBrowserFunction(
    window.switchToJavaUI,
    [],
    "Could not switch to classic UI",
    false,
    { block: false },
  );
};

export const switchWorkspace = () => {
  return callBrowserFunction(
    window.switchWorkspace,
    [],
    "Could not switch workspace",
    false,
    { block: true, darkenBackground: true },
  );
};

export const openAboutDialog = () => {
  return callBrowserFunction(
    window.openAboutDialog,
    [],
    "Could not open about dialog",
    false,
    { block: true, darkenBackground: true },
  );
};

export const openUpdateDialog = () => {
  return callBrowserFunction(
    window.openUpdateDialog,
    [],
    "Could not open update dialog",
    false,
    { block: true },
  );
};

export const openKNIMEHomeDir = () => {
  return callBrowserFunction(
    window.openKNIMEHomeDir,
    [],
    "Could not the KNIME home directory",
    false,
    { block: false },
  );
};

export const checkForUpdates = () => {
  return callBrowserFunction(
    window.checkForUpdates,
    [],
    "Could not check for updates",
    false,
    { block: false },
  );
};

export const openUrlInExternalBrowser = ({ url }: { url: string }) => {
  return callBrowserFunction(
    window.openUrlInExternalBrowser,
    [url],
    "Could not open URL in External Browser",
    false,
    { block: false },
  );
};

export const openWebUIPreferencePage = () => {
  return callBrowserFunction(
    window.openWebUIPreferencePage,
    [],
    "Could not open preferences",
    false,
    { block: true, darkenBackground: true },
  );
};

export const openInstallExtensionsDialog = () => {
  return callBrowserFunction(
    window.openInstallExtensionsDialog,
    [],
    "Could not open install extensions dialog",
    false,
    { block: false },
  );
};

export const openNodeDialog = ({
  projectId,
  nodeId,
}: {
  projectId: string;
  nodeId: string;
}) => {
  return callBrowserFunction(
    window.openNodeDialog,
    [projectId, nodeId],
    `Could not open dialog of node ${nodeId}`,
    false,
    { block: true, darkenBackground: false },
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
    { block: true, darkenBackground: true },
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
  return callBrowserFunction(
    window.openChangeComponentHubItemVersionDialog,
    [projectId, workflowId, nodeId],
    `Could not change Hub item version of component ${nodeId}`,
    false,
    { block: true },
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
  return callBrowserFunction(
    window.openChangeComponentLinkTypeDialog,
    [projectId, workflowId, nodeId],
    `Could not change link type of component ${nodeId}`,
    false,
    { block: true },
  );
};

export const openLegacyFlowVariableDialog = ({
  projectId,
  nodeId,
}: {
  projectId: string;
  nodeId: string;
}) => {
  return callBrowserFunction(
    window.openLegacyFlowVariableDialog,
    [projectId, nodeId],
    `Could not open legacy flow variable dialog of node ${nodeId}`,
    false,
    { block: true, darkenBackground: true },
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
  return callBrowserFunction(
    window.openLegacyPortView,
    [projectId, nodeId, portIdx, executeNode],
    `Could not execute and open view of node ${nodeId}`,
    false,
    { block: false },
  );
};

export const executeNodeAndOpenView = ({
  projectId,
  nodeId,
}: {
  projectId: string;
  nodeId: string;
}) => {
  return callBrowserFunction(
    window.executeNodeAndOpenView,
    [projectId, nodeId],
    `Could not execute and open view of node ${nodeId}`,
    false,
    { block: false },
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
  return callBrowserFunction(
    window.openPortView,
    [projectId, nodeId, portIndex, viewIndex],
    `Could not open detached view for node ${nodeId} and port #${portIndex}`,
    false,
    { block: false },
  );
};

export const saveWorkflow = ({
  projectId,
  workflowPreviewSvg,
}: {
  projectId: string;
  workflowPreviewSvg: string;
}) => {
  return callBrowserFunction(
    window.saveWorkflow,
    [projectId, workflowPreviewSvg],
    "Could not save workflow",
    false,
    { block: true },
  );
};

export const openWorkflow = ({
  spaceId = "local",
  itemId,
  spaceProviderId = "local",
}: FullSpacePath) => {
  return callBrowserFunction(
    window.openWorkflow,
    [spaceId, itemId, spaceProviderId],
    "Could not open workflow",
    false,
    { block: true },
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
    { block: true },
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
    { block: false },
  );
};

export const setProjectActiveAndEnsureItsLoaded = ({
  projectId,
}: {
  projectId: string;
}) => {
  return callBrowserFunction(
    window.setProjectActiveAndEnsureItsLoaded,
    [projectId],
    "Failed to set project as active in the backend",
    false,
    { block: false },
  );
};

export const openLayoutEditor = ({
  projectId,
  workflowId,
}: {
  projectId: string;
  workflowId: string;
}) => {
  return callBrowserFunction(
    window.openLayoutEditor,
    [projectId, workflowId],
    "Could not open layout editor",
    false,
    { block: true, darkenBackground: true },
  );
};

export const openOutsideLayoutEditor = ({
  projectId,
  nodeId,
}: {
  projectId: string;
  nodeId: string;
}) => {
  return callBrowserFunction(
    window.openLayoutEditor,
    [projectId, nodeId],
    "Could not open layout editor",
    false,
    { block: true, darkenBackground: true },
  );
};

export const openWorkflowCoachPreferencePage = () => {
  return callBrowserFunction(
    window.openWorkflowCoachPreferencePage,
    [],
    "Could not open workflow coach preference page",
    false,
    { block: true },
  );
};

export const getSpaceProviders = () => {
  return callBrowserFunction(
    window.getSpaceProviders,
    [],
    "Could not fetch space providers",
    false,
    { block: false },
  );
};

export const connectSpaceProvider = async ({
  spaceProviderId,
}: SpaceProviderId): Promise<SpaceProviderNS.SpaceProvider> => {
  const providerData = await callBrowserFunction(
    window.connectSpaceProvider,
    [spaceProviderId],
    `Could not connect to provider ${spaceProviderId}`,
    true,
    { block: true },
  );

  return JSON.parse(providerData);
};

export const disconnectSpaceProvider = ({
  spaceProviderId,
}: SpaceProviderId) => {
  return callBrowserFunction(
    window.disconnectSpaceProvider,
    [spaceProviderId],
    `Could not disconnect from provider ${spaceProviderId}`,
    false,
    { block: false },
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
    { block: true, darkenBackground: true },
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
    { block: true, darkenBackground: true },
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
    { block: true, darkenBackground: true },
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
    { block: false },
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
    { block: true, darkenBackground: true },
  );
};

export const moveOrCopyToSpace = ({
  spaceProviderId,
  spaceId,
  isCopy,
  itemIds,
}: SpaceProviderId & SpaceId & { isCopy: boolean } & { itemIds: string[] }) => {
  const copyOrMove = isCopy ? "copying" : "moving";
  return callBrowserFunction(
    window.moveOrCopyToSpace,
    [spaceProviderId, spaceId, isCopy, itemIds],
    `Error ${copyOrMove} to Hub space`,
    true,
    { block: true, darkenBackground: true },
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
    { block: false },
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
    { block: false },
  );
};

export const saveWorkflowAs = ({
  projectId,
  workflowPreviewSvg,
}: {
  projectId: string;
  workflowPreviewSvg: string;
}) => {
  return callBrowserFunction(
    window.saveWorkflowAs,
    [projectId, workflowPreviewSvg],
    "Could not save workflow locally",
    false,
    { block: true, darkenBackground: true },
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
  return callBrowserFunction(
    window.saveAndCloseWorkflows,
    [totalProjects, ...projectIds, ...svgSnapshots, ...params],
    "Could not save and close all workflows",
    false,
    { block: true },
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
    { block: true },
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
    { block: true },
  );
};

export const abortAiRequest = ({ conversationId, chainType }) => {
  return callBrowserFunction(
    window.abortAiRequest,
    [conversationId, chainType],
    "Could not abort AI request",
    false,
    { block: false },
  );
};

export const makeAiRequest = ({
  conversationId,
  chainType,
  projectId,
  workflowId,
  selectedNodes,
  messages,
}) => {
  return callBrowserFunction(
    window.makeAiRequest,
    [
      conversationId,
      chainType,
      projectId,
      workflowId,
      selectedNodes,
      JSON.stringify(messages),
    ],
    "Could not make AI request",
    false,
    { block: false },
  );
};

export const getUiStrings = async () => {
  const response = await callBrowserFunction(
    window.getUiStrings,
    [],
    "Could not get UI strings",
    true,
    { block: false },
  );
  return JSON.parse(response);
};

export const installKAI = () => {
  callBrowserFunction(window.installKAI, [], "Could not install KAI", false, {
    block: false,
  });
};

export const getHubID = () => {
  return callBrowserFunction(
    window.getHubID,
    [],
    "Could not get hub id",
    true,
    { block: false },
  );
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
    { block: true },
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
    { block: false },
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
    { block: true },
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
    { block: true },
  );
};
