import rpc from './json-rpc-adapter';
import { API } from '@api';

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
        return await API.node.getNodeDescription({
            nodeFactoryKey: {
                className,
                settings
            }
        });
    } catch (e) {
        consola.error(e);
        throw new Error('Could not fetch node description');
    }
};

/**
 * Calls the 'getNodeView' endpoint (see API documentation).
 *
 * @param {String} projectId
 * @param {String} workflowId
 * @param {String} nodeId
 * @returns {Object}
 */
export const getNodeView = async ({ projectId, workflowId, nodeId }) => {
    try {
        return await rpc('NodeService.getNodeView', projectId, workflowId, nodeId);
    } catch (e) {
        consola.error(e);
        throw new Error(`Could not fetch node view for node ${nodeId}`);
    }
};

/**
 * Calls the 'updateDataPointSelection' endpoint (see API documentation).
 * @param {String} projectId
 * @returns {void}
 */
export const updateDataPointSelection = async () => {
    // TODO: implement update selection. Also, is this needed for our use case?
};

/**
 * Calls the 'getNodeDialog' endpoint (see API documentation).
 *
 * @param {String} projectId
 * @param {String} workflowId
 * @param {String} nodeId
 * @returns {Object}
 */
export const getNodeDialog = async ({ projectId, workflowId, nodeId }) => {
    try {
        return await rpc('NodeService.getNodeDialog', projectId, workflowId, nodeId);
    } catch (e) {
        consola.error(e);
        throw new Error(`Could not fetch node dialog for node ${nodeId}`);
    }
};

/**
 * Calls the 'callNodeDataService' endpoint (see API documentation).
 *
 * @param {String} projectId
 * @param {String} workflowId
 * @param {String} nodeId
 * @param {String} extensionType
 * @param {String} serviceType
 * @param {String} request
 * @returns {String}
 */
export const callNodeDataService =
    async ({ projectId, workflowId, nodeId, extensionType, serviceType, request }) => {
        try {
            return await rpc(
                'NodeService.callNodeDataService',
                projectId, workflowId, nodeId, extensionType, serviceType, request
            );
        } catch (e) {
            consola.error(e);
            throw new Error(`Could not call node data service for node ${nodeId}`);
        }
    };
