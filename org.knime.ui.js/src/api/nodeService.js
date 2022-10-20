import rpc from './json-rpc-adapter';

/**
 * Do Action on nodes or an entire workflow.
 * @param {'reset' | 'execute' | 'cancel'} cfg.action
 * @param {String} cfg.projectId
 * @param {String} cfg.workflowId
 * @param {Array=} cfg.nodeIds The nodes to act upon. Optional.
 *     If you want to execute an entire workflow, pass nothing.
 * @returns {Promise}
 */
export const changeNodeState = async ({ projectId, workflowId, nodeIds = [], action }) => {
    try {
        return await rpc('NodeService.changeNodeStates', projectId, workflowId, nodeIds, action);
    } catch (e) {
        consola.error(e);
        throw new Error(`Could not ${action} nodes ${nodeIds}`);
    }
};

/**
 * Actions for LoopExecution.
 * @param {'step' | 'pause' | 'resume'} cfg.action
 * @param {String} cfg.projectId
 * @param {String} cfg.workflowId
 * @param {String} cfg.nodeId The node to act upon.
 * @returns {Promise}
 */
export const changeLoopState = async ({ projectId, workflowId, nodeId, action }) => {
    try {
        return await rpc(`NodeService.changeLoopState`, projectId, workflowId, nodeId, action);
    } catch (e) {
        consola.error(e);
        throw new Error(`Could not ${action} node ${nodeId}`);
    }
};

/**
 * Actions for node description.
 * @param {String} cfg.className - class name of the selected node
 * @param {String} cfg.settings - settings of the selected node
 * @returns {Object} the node description.
 */
export const getNodeDescription = async ({ className, settings }) => {
    try {
        const node = await rpc('NodeService.getNodeDescription', { className, settings });

        return node;
    } catch (e) {
        consola.error(e);
        throw new Error('Could not fetch node description');
    }
};
