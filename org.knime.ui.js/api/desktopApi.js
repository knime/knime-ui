/**
 * Open the native (Java) configuration dialog of a node.
 * @param {String} projectId
 * @param {String} nodeId The node for which to open the dialog.
 * @returns {void}
 */
export const openDialog = ({ projectId, nodeId }) => {
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
export const saveWorkflow = ({ projectId }) => {
    try {
        // returns falsy on success
        let error = window.saveWorkflow(projectId);
        if (error) {
            throw new Error(error);
        }
    } catch (e) {
        consola.error(`Could not save workflow`, e);
    }
};

/**
 * Open a workflow.
 * @returns {void}
 */
export const openWorkflow = () => {
    try {
        // returns falsy on success
        let error = window.openWorkflow();
        if (error) {
            throw new Error(error);
        }
    } catch (e) {
        consola.error(`Could not open workflow`, e);
    }
};

/**
 * Close a workflow.
 * @param {String} projectId
 * @returns {void}
 */
export const closeWorkflow = ({ projectId }) => {
    try {
        // returns falsy on success
        let error = window.closeWorkflow(projectId);
        if (error) {
            throw new Error(error);
        }
    } catch (e) {
        consola.error(`Could not close workflow`, e);
    }
};
