import rpc from './json-rpc-adapter.js';

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
        let result = await rpc('NodeService.changeNodeStates', projectId, workflowId, nodeIds, action);
        return result;
    } catch (e) {
        consola.error(e);
        return new Error(`Could not ${action} nodes ${nodeIds}`);
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
        let result = await rpc(`NodeService.changeLoopState`, projectId, workflowId, nodeId, action);
        return result;
    } catch (e) {
        consola.error(e);
        return new Error(`Could not ${action} node ${nodeId}`);
    }
};
