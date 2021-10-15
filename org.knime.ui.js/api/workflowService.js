import rpc from './json-rpc-adapter.js';

/**
 * Load a specific workflow.
 * @param {String} projectId The ID of the project to load
 * @param {String} workflowId The ID of the component / metanode that contains the workflow, or "root" for the
 *   top-level workflow. Defaults to `'root'`.
 * @param {String} includeInfoOnAllowedActions Whether to enclose information on the actions
 *   (such as reset, execute, cancel) allowed on the contained nodes and the entire workflow itself.
 Defaults to `true`.
 * @return {Promise} A promise containing the workflow as defined in the API
 */
export const loadWorkflow = ({ projectId, workflowId = 'root', includeInfoOnAllowedActions = true }) => {
    try {
        const workflow = rpc('WorkflowService.getWorkflow', projectId, workflowId, includeInfoOnAllowedActions);
        consola.debug('Loaded workflow', workflow);

        return Promise.resolve(workflow);
    } catch (e) {
        consola.error(e);
        return Promise.reject(new Error(`Couldn't load workflow "${workflowId}" from project "${projectId}"`));
    }
};


/**
 * Generates workflow commands that are part of the undo/redo stack
 * @param { String } cfg.projectId
 * @param { String } cfg.workflowId
 * @param {String} cfg.command name of the command to be executed
 * @param {String} cfg.args arguments for the command
 * @returns {Promise}
 */
const workflowCommand = ({ projectId, workflowId, command, args }) => {
    try {
        let rpcArgs = {
            kind: command,
            ...args
        };
        let result = rpc(`WorkflowService.executeWorkflowCommand`, projectId, workflowId, rpcArgs);
        return Promise.resolve(result);
    } catch (e) {
        consola.error(e);
        return Promise.reject(new Error(`Couldn't execute ${command}(${JSON.stringify(args)})`));
    }
};


/**
 * @param { String } cfg.projectId
 * @param { String } cfg.workflowId
 * @param { Array } cfg.nodeIds The nodes to be deleted
 * @param { Array } cfg.annotationIds The annotations to be deleted
 * @param { Array } cfg.connectionIds The connections to be deleted
 * @returns { Promise } Promise
 */
export const deleteObjects = ({
    nodeIds = [], annotationIds = [], connectionIds = [], projectId, workflowId
}) => workflowCommand({
    command: 'delete',
    args: { nodeIds, annotationIds, connectionIds },
    projectId,
    workflowId
});


/**
 * @param { String } cfg.projectId
 * @param { String } cfg.workflowId
 * @param { Array } cfg.nodeIds The nodes to be moved
 * @param { Array } cfg.annotationIds The annotations to be moved
 * @param { Array } cfg.translation the translation by which the objects are to be moved
 * @returns { Promise } Promise
 */
export const moveObjects = ({
    projectId, workflowId, nodeIds = [], translation, annotationIds = []
}) => workflowCommand({
    command: 'translate',
    args: { nodeIds, annotationIds, translation },
    projectId,
    workflowId
});


/**
 * @param { String } cfg.projectId
 * @param { String } cfg.workflowId
 * @param { String } cfg.sourceNode node with outPort
 * @param { String } cfg.destNode   node with inPort
 * @param { String } cfg.sourcePort index of outPort
 * @param { String } cfg.destPort   index of inPort
 * @returns { Promise } Promise
 */
export const connectNodes = ({ projectId, workflowId, sourceNode, sourcePort, destNode, destPort }) => workflowCommand({
    command: 'connect',
    args: {
        sourceNodeId: sourceNode,
        sourcePortIdx: sourcePort,
        destinationNodeId: destNode,
        destinationPortIdx: destPort
    },
    projectId,
    workflowId
});


/**
 * Performs an undo command
 * @param { String } cfg.projectId
 * @param { String } cfg.workflowId
 * @returns {Promise}
 */
export const undo = ({ projectId, workflowId }) => {
    try {
        let result = rpc(`WorkflowService.undoWorkflowCommand`, projectId, workflowId);
        return Promise.resolve(result);
    } catch (e) {
        consola.error(e);
        return Promise.reject(new Error('Couldn\'t undo'));
    }
};


/**
 * Performs a redo command
 * @param { String } cfg.projectId
 * @param { String } cfg.workflowId
 * @returns {Promise}
 */
export const redo = ({ projectId, workflowId }) => {
    try {
        let result = rpc(`WorkflowService.redoWorkflowCommand`, projectId, workflowId);
        return Promise.resolve(result);
    } catch (e) {
        consola.error(e);
        return Promise.reject(new Error('Couldn\'t redo'));
    }
};
