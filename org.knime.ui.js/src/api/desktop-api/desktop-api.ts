/* eslint-disable max-lines */
import { isBrowser, runInEnvironment } from "@/environment";
import { $bus } from "@/plugins/event-bus";
import { retryAsyncCall } from "@/util/retryAsyncCall";
import {
  type AncestorInfo,
  type ExampleProject,
  type FullSpacePath,
  type RecentWorkflow,
  type SpaceId,
  type SpaceItemId,
  type SpaceProviderId,
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
  if (isBrowser()) {
    return Promise.resolve(null);
  }

  try {
    // register for events
    const result = new Promise<ReturnType<TFunction>>((resolve, reject) => {
      // 'forwarded' backend event from events.ts
      $bus.on(
        `desktop-api-function-result-${browserFunction.name}`,
        (payload) => {
          $bus.off(`desktop-api-function-result-${browserFunction.name}`);

          // unblock UI (if it was blocked) when the desktop function has returned (which is indicated by this event)
          if (blockUi.block) {
            $bus.emit("unblock-ui");
          }

          // consider the result an error if we got one even for void functions
          if (!returnsValue && payload.result) {
            consola.error(
              "Desktop API:: Function did not expect a return value",
              { browserFunction, params, payload },
            );
            reject(
              new Error(
                `${browserFunction.name} Function did not expect a return value. Got: ${payload.result}`,
              ),
            );
            return; // To really stop execution here
          }

          // consider the result an error if the 'error' property present and non-empty
          if ("error" in payload && payload.error) {
            consola.error("Desktop API:: Error response", {
              message: messageOnError,
              browserFunction,
              params,
              payload,
            });
            reject(payload.error);
            return; // To really stop execution here
          }

          resolve(payload.result as ReturnType<TFunction>);
        },
      );
    });

    if (blockUi.block) {
      $bus.emit("block-ui", {
        darkenBackground: blockUi.darkenBackground,
      });
    }

    consola.info("Desktop API::", { browserFunction, params });
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

// TODO: NXT-989 remove this delay once desktop calls are made via EquoComm
export const waitForDesktopAPI = async () => {
  await runInEnvironment({
    DESKTOP: async () => {
      consola.trace("Waiting for desktop API to be available");
      const RETRY_DELAY_MS = 50;
      await retryAsyncCall<boolean>(
        () => {
          // check for any desktop api function since we just care that they're
          // defined and available for use
          // eslint-disable-next-line no-undefined
          if (window.setProjectActiveAndEnsureItsLoaded === undefined) {
            throw new Error("Desktop API not available yet. Waiting");
          } else {
            return Promise.resolve(true);
          }
        },
        RETRY_DELAY_MS,
        100,
      );
    },
  });
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
    true,
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

export const saveProject = ({
  projectId,
  workflowPreviewSvg,
}: {
  projectId: string;
  workflowPreviewSvg: string | null;
}) => {
  return callBrowserFunction(
    window.saveProject,
    [projectId, workflowPreviewSvg],
    "Could not save workflow",
    true,
    { block: true },
  );
};

export const openProject = ({
  spaceId = "local",
  itemId,
  spaceProviderId = "local",
}: FullSpacePath) => {
  return callBrowserFunction(
    window.openProject,
    [spaceId, itemId, spaceProviderId],
    "Could not open workflow",
    false,
    { block: true },
  );
};

export const closeProject = ({
  closingProjectId,
  nextProjectId,
}: {
  closingProjectId: string;
  nextProjectId: string | null;
}) => {
  return callBrowserFunction(
    window.closeProject,
    [closingProjectId, nextProjectId],
    "Could not close workflow",
    true,
    { block: true },
  );
};

export const forceCloseProjects = ({
  projectIds,
}: {
  projectIds: Array<string>;
}) => {
  return callBrowserFunction(
    window.forceCloseProjects,
    projectIds,
    "Could not close workflow",
    true,
    { block: false },
  );
};

export const setProjectActiveAndEnsureItsLoaded = ({
  projectId,
  versionId,
}: {
  projectId: string;
  versionId: string;
}) => {
  return callBrowserFunction(
    window.setProjectActiveAndEnsureItsLoaded,
    [projectId, versionId],
    "Failed to set project as active in the backend",
    true,
    { block: true },
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

export const openWorkflowCoachPreferencePage = () => {
  return callBrowserFunction(
    window.openWorkflowCoachPreferencePage,
    [],
    "Could not open workflow coach preference page",
    false,
    { block: true },
  );
};

export const connectSpaceProvider = async ({
  spaceProviderId,
}: SpaceProviderId): Promise<SpaceProviderNS.SpaceProvider | null> => {
  const providerData = await callBrowserFunction(
    window.connectSpaceProvider,
    [spaceProviderId],
    `Could not connect to provider ${spaceProviderId}`,
    true,
    { block: true },
  );

  return providerData ? JSON.parse(providerData) : null;
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
  usageContext,
}: SpaceProviderId &
  SpaceId & {
    itemIds: string[];
    destinationItemId: string;
    usageContext: "IMPORT" | "SAVE" | "COPY" | "MOVE";
  }) => {
  return callBrowserFunction(
    window.getNameCollisionStrategy,
    [spaceProviderId, spaceId, itemIds, destinationItemId, usageContext],
    "Could not check for name collisions",
    true,
    { block: false },
  );
};

export const copyBetweenSpaces = ({
  sourceProviderId = "local",
  sourceSpaceId = "local",
  sourceItemIds,
  destinationProviderId,
  destinationSpaceId,
  destinationItemId,
  excludeData = false,
}: {
  sourceProviderId: SpaceProviderId["spaceProviderId"];
  sourceSpaceId: SpaceId["spaceId"];
  sourceItemIds: Array<SpaceItemId["itemId"]>;
  destinationProviderId: SpaceProviderId["spaceProviderId"];
  destinationSpaceId: SpaceId["spaceId"];
  destinationItemId: SpaceItemId["itemId"];
  excludeData?: boolean;
}) => {
  return callBrowserFunction(
    window.copyBetweenSpaces,
    [
      sourceProviderId,
      sourceSpaceId,
      sourceItemIds,
      destinationProviderId,
      destinationSpaceId,
      destinationItemId,
      excludeData,
    ],
    "Error uploading to Hub space",
    true,
    { block: true, darkenBackground: true },
  );
};

export const openInBrowser = ({
  spaceProviderId,
  spaceId,
  itemId,
}: FullSpacePath) => {
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
}: FullSpacePath) => {
  return callBrowserFunction(
    window.openAPIDefinition,
    [spaceProviderId, spaceId, itemId],
    "Error opening in Hub",
    false,
    { block: false },
  );
};

export const saveProjectAs = ({
  projectId,
  workflowPreviewSvg,
}: {
  projectId: string;
  workflowPreviewSvg: string | null;
}) => {
  return callBrowserFunction(
    window.saveProjectAs,
    [projectId, workflowPreviewSvg],
    "Could not save workflow locally",
    false,
    { block: true, darkenBackground: true },
  );
};

export const saveAndCloseProjects = ({
  totalProjects,
  projectIds,
  svgSnapshots,
}: {
  totalProjects: number;
  projectIds: string[];
  svgSnapshots: Array<string | null>;
}) => {
  return callBrowserFunction(
    window.saveAndCloseProjects,
    [totalProjects, ...projectIds, ...svgSnapshots],
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
}: FullSpacePath & {
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

export const openAiAssistantPreferencePage = () => {
  return callBrowserFunction(
    window.openAiAssistantPreferencePage,
    [],
    "Could not open AI assistant preferences",
    false,
    { block: true, darkenBackground: true },
  );
};

export const openPermissionsDialog = ({
  spaceProviderId,
  spaceId,
  itemId,
}: FullSpacePath) => {
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
}: FullSpacePath) => {
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
}: FullSpacePath & { jobId: string; jobName: string }) => {
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
}: FullSpacePath & { scheduleId: string }) => {
  return callBrowserFunction(
    window.editSchedule,
    [spaceProviderId, spaceId, itemId, scheduleId],
    "Could not edit schedule",
    true,
    { block: true },
  );
};

export const openWorkflowConfiguration = (projectId: string) => {
  return callBrowserFunction(
    window.openWorkflowConfiguration,
    [projectId],
    "Could not open workflow configuration",
    true,
    { block: true },
  );
};

export const setZoomLevel = (zoomLevel: number) => {
  return callBrowserFunction(
    window.setZoomLevel,
    [zoomLevel],
    "Could not set zoom level",
    false,
    { block: false },
  );
};

export const setConfirmNodeConfigChangesPreference = (value: boolean) => {
  return callBrowserFunction(
    window.setConfirmNodeConfigChangesPreference,
    [value],
    "Could not set preference",
    true,
    { block: false },
  );
};

export const updateAndGetMostRecentlyUsedProjects = async (): Promise<
  RecentWorkflow[]
> => {
  const response = await callBrowserFunction(
    window.updateAndGetMostRecentlyUsedProjects,
    [],
    "Failed to fetch most recently used projects",
    true,
    { block: false },
  );

  return JSON.parse(response ?? "[]");
};

export const removeMostRecentlyUsedProject = ({
  spaceProviderId,
  spaceId,
  itemId,
}: FullSpacePath) => {
  return callBrowserFunction(
    window.removeMostRecentlyUsedProject,
    [spaceProviderId, spaceId, itemId],
    "Failed to remove most recently used project",
    false,
    { block: false },
  );
};

export const updateMostRecentlyUsedProject = ({
  spaceProviderId,
  spaceId,
  itemId,
  newName,
}: FullSpacePath & { newName?: string }) => {
  return callBrowserFunction(
    window.updateMostRecentlyUsedProject,
    [spaceProviderId, spaceId, itemId, newName],
    "Failed to update most recently used project",
    false,
    { block: false },
  );
};

export const getCustomHelpMenuEntries = () => {
  return callBrowserFunction(
    window.getCustomHelpMenuEntries,
    [],
    "Failed to fetch custom help menu entries",
    true,
    { block: true },
  );
};

export const openLockSubnodeDialog = ({
  projectId,
  nodeId,
}: {
  projectId: string;
  nodeId: string;
}) => {
  return callBrowserFunction(
    window.openLockSubnodeDialog,
    [projectId, nodeId],
    `Could not open lock component dialog for component ${nodeId}`,
    false,
    { block: true, darkenBackground: true },
  );
};

export const unlockSubnode = ({
  projectId,
  nodeId,
}: {
  projectId: string;
  nodeId: string;
}) => {
  return callBrowserFunction(
    window.unlockSubnode,
    [projectId, nodeId],
    `Could not unlock component ${nodeId}`,
    true,
    { block: true, darkenBackground: true },
  );
};

type HomePageTileResponse = {
  title: string;
  tag: string;
  image: string;
  text: string;
  "button-text": string;
  link: string;
};

export const getHomePageTile = async () => {
  const data = await callBrowserFunction(
    window.getHomePageTile,
    [],
    "Failed to fetch home page tile",
    true,
    { block: false },
  );

  return data as HomePageTileResponse;
};

export const getExampleProjects = async () => {
  const data = await callBrowserFunction(
    window.getExampleProjects,
    [],
    "Failed to fetch example projects",
    true,
    { block: false },
  );
  return (data ? JSON.parse(data) : []) as Array<ExampleProject>;
};

export const getAncestorInfo = async ({
  providerId,
  spaceId,
  itemId,
}: {
  providerId: string;
  spaceId: string;
  itemId: string;
}) => {
  const data = await callBrowserFunction(
    window.getAncestorInfo,
    [providerId, spaceId, itemId],
    "Failed to fetch ancestor item IDs",
    true,
    { block: false },
  );
  return (data ? JSON.parse(data) : {}) as AncestorInfo;
};

export const updateOpenProjectsOrder = ({
  projectIds,
}: {
  projectIds: Array<string>;
}) => {
  return callBrowserFunction(
    window.updateOpenProjectsOrder,
    projectIds,
    "Could not update open projects order",
    false,
    { block: false },
  );
};

export const setUserProfilePart = ({ key, data }) => {
  return callBrowserFunction(
    window.setUserProfilePart,
    [key, JSON.stringify(data)],
    "Failed to update the user profile",
    false,
    { block: false },
  );
};

export const getUserProfilePart = ({ key }) => {
  return callBrowserFunction(
    window.getUserProfilePart,
    [key],
    "Failed to retrieve the user profile",
    true,
    { block: false },
  );
};
