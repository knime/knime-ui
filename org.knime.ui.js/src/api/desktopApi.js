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
 * @param {String} workflowItemId
 * @returns {void}
 */
export const openWorkflow = ({ spaceId = 'local', workflowItemId }) => {
    try {
        // returns falsy on success
        const error = window.openWorkflow(spaceId, workflowItemId);
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
        window.connectSpaceProvider(spaceProviderId);
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
