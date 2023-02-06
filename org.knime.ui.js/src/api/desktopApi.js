/**
 * Open the native (Java) configuration dialog of a node.
 * @param {String} projectId
 * @param {String} nodeId The node for which to open the dialog.
 * @returns {void}
 */
export const openNodeDialog = ({ projectId, nodeId }) => {
    try {
        // returns falsy on success
        let error = window.openNodeDialog(projectId, nodeId);
        if (error) {
            throw new Error(error);
        }
    } catch (e) {
        consola.error(`Could not open dialog of node ${nodeId}`, e);
    }
};

/**
 * Open the native (Java) legacy flow variable configuration dialog of a node.
 * @param {String} projectId
 * @param {String} nodeId The node for which to open the dialog.
 * @returns {void}
 */
export const openLegacyFlowVariableDialog = ({ projectId, nodeId }) => {
    try {
        // returns falsy on success
        let error = window.openLegacyFlowVariableDialog(projectId, nodeId);
        if (error) {
            throw new Error(error);
        }
    } catch (e) {
        consola.error(`Could not open legacy flow variable dialog of node ${nodeId}`, e);
    }
};

/**
 * Open the native (Java) view window of a node.
 * @param {String} projectId
 * @param {String} nodeId The node for which to open the view.
 * @returns {void}
 */
export const openView = ({ projectId, nodeId }) => {
    try {
        // returns falsy on success
        let error = window.openNodeView(projectId, nodeId);
        if (error) {
            throw new Error(error);
        }
    } catch (e) {
        consola.error(`Could not open view of node ${nodeId}`, e);
    }
};

/**
 * Save a workflow.
 * @param {String} projectId
 * @returns {void}
 */
export const saveWorkflow = ({ projectId, workflowPreviewSvg }) => {
    try {
        // returns falsy on success
        let error = window.saveWorkflow(projectId, workflowPreviewSvg);
        if (error) {
            throw new Error(error);
        }
    } catch (e) {
        consola.error(`Could not save workflow`, e);
    }
};

/**
 * Open a workflow.
 * @param {Object} param
 * @param {String} [param.spaceId]
 * @param {String} param.workflowItemId
 * @returns {void}
 */
export const openWorkflow = ({ spaceId = 'local', workflowItemId, spaceProviderId = 'local' }) => {
    try {
        // returns falsy on success
        const error = window.openWorkflow(spaceId, workflowItemId, spaceProviderId);
        if (error) {
            throw new Error(error);
        }
    } catch (e) {
        consola.error(`Could not open workflow`, e);
    }
};

/**
 * Close a workflow.
 * @param {Object} param projectId to close
 * @param {String} param.closingProjectId projectId to close
 * @param {String | Null} param.nextProjectId projectId that should be set as active after close
 * @returns {void}
 */
export const closeWorkflow = ({ closingProjectId, nextProjectId }) => {
    try {
        // returns true on success
        return window.closeWorkflow(closingProjectId, nextProjectId);
    } catch (e) {
        consola.error(`Could not close workflow`, e);
        return false;
    }
};

/**
 * Ensures that a project-workflow is loaded (and loads it, if not) and set it to be the active one.
 * @param {String} projectId
 * @returns {void}
 */
export const setProjectActiveAndEnsureItsLoadedInBackend = ({ projectId }) => {
    try {
        window.setProjectActiveAndEnsureItsLoaded(projectId);
    } catch (error) {
        consola.error(`Failed to set project as active in the backend`, { projectId, error });
        throw error;
    }
};

/**
 * Opens the layout editor for a component.
 * @param {String} projectId
 * @param {String} workflowId
 * @returns {void}
 */
export const openLayoutEditor = ({ projectId, workflowId }) => {
    try {
        // returns falsy on success
        let error = window.openLayoutEditor(projectId, workflowId);
        if (error) {
            throw new Error(error);
        }
    } catch (e) {
        consola.error(`Could not open layout editor`, e);
    }
};

/**
 * Opens workflow coach preference page
 * @returns {void}
 */
export const openWorkflowCoachPreferencePage = () => {
    try {
        // returns falsy on success
        let error = window.openWorkflowCoachPreferencePage();
        if (error) {
            throw new Error(error);
        }
    } catch (e) {
        consola.error(`Could not open preference page`, e);
    }
};

/**
 * @typedef SpaceProvider
 * @property {String} id
 * @property {String} name
 * @property {Boolean} connected
 * @property {'AUTHENTICATED' | 'ANONYMOUS' | 'AUTOMATIC'} connectionMode
 */
/**
 * Get all available space providers
 * @returns {Record<string, SpaceProvider>}
 */
export const fetchAllSpaceProviders = () => {
    try {
        const spaceProviders = window.getSpaceProviders();
        return Promise.resolve(JSON.parse(spaceProviders));
    } catch (error) {
        consola.error(`Could not fetch space providers`, error);
        throw error;
    }
};

export const connectSpaceProvider = ({ spaceProviderId }) => {
    try {
        const user = window.connectSpaceProvider(spaceProviderId);
        return JSON.parse(user);
    } catch (error) {
        consola.error(`Could not connect to provider`, { spaceProviderId, error });
        throw error;
    }
};

export const disconnectSpaceProvider = ({ spaceProviderId }) => {
    try {
        const user = window.disconnectSpaceProvider(spaceProviderId);
        return JSON.parse(user);
    } catch (error) {
        consola.error(`Could not disconnect from provider`, { spaceProviderId, error });
        throw error;
    }
};

export const importFiles = ({ spaceProviderId = 'local', spaceId = 'local', itemId }) => {
    try {
        // Returns true on success
        return window.importFiles(spaceProviderId, spaceId, itemId);
    } catch (error) {
        consola.error(`Could not import files`, { spaceProviderId, spaceId, itemId, error });
        throw error;
    }
};

export const importWorkflows = ({ spaceProviderId = 'local', spaceId = 'local', itemId }) => {
    try {
        // Returns true on success
        return window.importWorkflows(spaceProviderId, spaceId, itemId);
    } catch (error) {
        consola.error(`Could not import workflows`, { spaceProviderId, spaceId, itemId, error });
        throw error;
    }
};

export const checkForNameCollisionsAndPickCollisionHandling = ({
    spaceProviderId = 'local',
    spaceId = 'local',
    itemIds,
    destWorkflowGroupItemId
}) => {
    try {
        const collisionHandling = window.checkForNameCollisionsAndPickCollisionHandling(
            spaceProviderId, spaceId, itemIds, destWorkflowGroupItemId
        );
        return collisionHandling;
    } catch (error) {
        consola.error(`Could not check for collisions`,
            { spaceProviderId, spaceId, itemIds, destWorkflowGroupItemId, error });
        throw error;
    }
};
