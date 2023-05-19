export const openNodeDialog = ({
  projectId,
  nodeId,
}: {
  projectId: string;
  nodeId: string;
}) => {
  try {
    // returns falsy on success
    const error = window.openNodeDialog(projectId, nodeId);
    if (error) {
      throw new Error(error);
    }
  } catch (e) {
    consola.error(`Could not open dialog of node ${nodeId}`, e);
  }
};

export const openLegacyFlowVariableDialog = ({
  projectId,
  nodeId,
}: {
  projectId: string;
  nodeId: string;
}) => {
  try {
    // returns falsy on success
    const error = window.openLegacyFlowVariableDialog(projectId, nodeId);
    if (error) {
      throw new Error(error);
    }
  } catch (e) {
    consola.error(
      `Could not open legacy flow variable dialog of node ${nodeId}`,
      e
    );
  }
};

export const executeNodeAndOpenView = ({
  projectId,
  nodeId,
}: {
  projectId: string;
  nodeId: string;
}) => {
  try {
    window.executeNodeAndOpenView(projectId, nodeId);
  } catch (e) {
    consola.error(`Could not execute and open view of node ${nodeId}`, e);
  }
};

export const saveWorkflow = ({
  projectId,
  workflowPreviewSvg,
}: {
  projectId: string;
  workflowPreviewSvg: string;
}) => {
  try {
    // returns falsy on success
    const error = window.saveWorkflow(projectId, workflowPreviewSvg);
    if (error) {
      throw new Error(error);
    }
  } catch (e) {
    consola.error("Could not save workflow", e);
  }
};

export type SpaceProviderId = { spaceProviderId: string };
export type SpaceId = { spaceId: string };
export type SpaceItemId = { itemId: string };
export type FullSpacePath = SpaceProviderId & SpaceId & SpaceItemId;

export const openWorkflow = ({
  spaceId = "local",
  itemId,
  spaceProviderId = "local",
}: FullSpacePath) => {
  try {
    // returns falsy on success
    const error = window.openWorkflow(spaceId, itemId, spaceProviderId);
    if (error) {
      throw new Error(error);
    }
  } catch (e) {
    consola.error("Could not open workflow", e);
  }
};

export const closeWorkflow = ({
  closingProjectId,
  nextProjectId,
}: {
  closingProjectId: string;
  nextProjectId: string;
}) => {
  try {
    // returns true on success
    return window.closeWorkflow(closingProjectId, nextProjectId);
  } catch (e) {
    consola.error("Could not close workflow", e);
    return false;
  }
};

export const forceCloseWorkflows = ({
  projectIds,
}: {
  projectIds: Array<string>;
}) => {
  try {
    // returns true on success
    return window.forceCloseWorkflows(...projectIds);
  } catch (e) {
    consola.error("Could not close workflow", e);
    return false;
  }
};

export const setProjectActiveAndEnsureItsLoaded = ({
  projectId,
}: {
  projectId: string;
}) => {
  try {
    window.setProjectActiveAndEnsureItsLoaded(projectId);
  } catch (error) {
    consola.error("Failed to set project as active in the backend", {
      projectId,
      error,
    });
    throw error;
  }
};

export const openLayoutEditor = ({
  projectId,
  workflowId,
}: {
  projectId: string;
  workflowId: string;
}) => {
  try {
    // returns falsy on success
    const error = window.openLayoutEditor(projectId, workflowId);
    if (error) {
      throw new Error(error);
    }
  } catch (e) {
    consola.error("Could not open layout editor", e);
  }
};

export const openWorkflowCoachPreferencePage = () => {
  try {
    // returns falsy on success
    const error = window.openWorkflowCoachPreferencePage();
    if (error) {
      throw new Error(error);
    }
  } catch (e) {
    consola.error("Could not open preference page", e);
  }
};

export interface SpaceProvider {
  id: string;
  name: string;
  connected: boolean;
  connectionMode: "AUTHENTICATED" | "ANONYMOUS" | "AUTOMATIC";
}

export const fetchAllSpaceProviders = (): Promise<
  Record<string, SpaceProvider>
> => {
  try {
    const spaceProviders = window.getSpaceProviders();
    return Promise.resolve(JSON.parse(spaceProviders));
  } catch (error) {
    consola.error("Could not fetch space providers", error);
    throw error;
  }
};

export interface SpaceUser {
  name: string;
}

export const connectSpaceProvider = ({ spaceProviderId }: SpaceProviderId) => {
  try {
    const user = window.connectSpaceProvider(spaceProviderId);
    return JSON.parse(user);
  } catch (error) {
    consola.error("Could not connect to provider", { spaceProviderId, error });
    throw error;
  }
};

export const disconnectSpaceProvider = ({
  spaceProviderId,
}: SpaceProviderId) => {
  try {
    const user = window.disconnectSpaceProvider(spaceProviderId);
    return Promise.resolve(JSON.parse(user));
  } catch (error) {
    consola.error("Could not disconnect from provider", {
      spaceProviderId,
      error,
    });
    throw error;
  }
};

export const importFiles = ({
  spaceProviderId = "local",
  spaceId = "local",
  itemId,
}: FullSpacePath) => {
  try {
    // Returns true on success
    return window.importFiles(spaceProviderId, spaceId, itemId);
  } catch (error) {
    consola.error("Could not import files", {
      spaceProviderId,
      spaceId,
      itemId,
      error,
    });
    throw error;
  }
};

export const importWorkflows = ({
  spaceProviderId = "local",
  spaceId = "local",
  itemId,
}: FullSpacePath) => {
  try {
    // Returns true on success
    return window.importWorkflows(spaceProviderId, spaceId, itemId);
  } catch (error) {
    consola.error("Could not import workflows", {
      spaceProviderId,
      spaceId,
      itemId,
      error,
    });
    throw error;
  }
};

export const getNameCollisionStrategy = ({
  spaceProviderId = "local",
  spaceId = "local",
  itemIds,
  destinationItemId,
}: SpaceProviderId &
  SpaceId & { itemIds: string[]; destinationItemId: string }) => {
  try {
    const collisionStrategy = window.getNameCollisionStrategy(
      spaceProviderId,
      spaceId,
      itemIds,
      destinationItemId
    );
    return collisionStrategy;
  } catch (error) {
    consola.error("Could not check for collisions", {
      spaceProviderId,
      spaceId,
      itemIds,
      destinationItemId,
      error,
    });
    throw error;
  }
};

export const copyBetweenSpaces = ({
  spaceProviderId = "local",
  spaceId = "local",
  itemIds,
}: SpaceProviderId & SpaceId & { itemIds: string[] }) => {
  try {
    return window.copyBetweenSpaces(spaceProviderId, spaceId, itemIds);
  } catch (error) {
    consola.error("Error uploading to Hub space", { error });
    throw error;
  }
};

export const saveWorkflowAs = ({
  projectId,
  workflowPreviewSvg,
}: {
  projectId: string;
  workflowPreviewSvg: string;
}) => {
  try {
    window.saveWorkflowAs(projectId, workflowPreviewSvg);
  } catch (error) {
    consola.error("Could not save workflow locally", { projectId, error });
    throw error;
  }
};
