import rpc from './json-rpc-adapter.js';

/**
 * Load a specific workflow.
 * @param {Object} cfg The configuration object
 * @param {String} cfg.projectId The ID of the project to load
 * @param {String} cfg.workflowId The ID of the component / metanode that contains the workflow, or "root" for the
 *   top-level workflow. Defaults to `'root'`.
 * @param {Boolean} cfg.includeInfoOnAllowedActions Whether to enclose information on the actions
 *   (such as reset, execute, cancel) allowed on the contained nodes and the entire workflow itself.
 Defaults to `true`.
 * @return {Promise} A promise containing the workflow as defined in the API
 */
export const loadWorkflow = async ({ projectId, workflowId = 'root', includeInfoOnAllowedActions = true }) => {
    try {
        const workflow = await rpc('WorkflowService.getWorkflow', projectId, workflowId, includeInfoOnAllowedActions);
        consola.debug('Loaded workflow', workflow);

        return workflow;
    } catch (e) {
        consola.error(e);
        throw new Error(`Couldn't load workflow "${workflowId}" from project "${projectId}"`);
    }
};


/**
 * Generates workflow commands that are part of the undo/redo stack
 * @param {Object} cfg The configuration object
 * @param { String } cfg.projectId
 * @param { String } cfg.workflowId
 * @param {String} cfg.command name of the command to be executed
 * @param {String} cfg.args arguments for the command
 * @returns {Promise}
 */
const workflowCommand = async ({ projectId, workflowId, command, args }) => {
    try {
        let rpcArgs = {
            kind: command,
            ...args
        };
        return await rpc(`WorkflowService.executeWorkflowCommand`, projectId, workflowId, rpcArgs);
    } catch (e) {
        consola.error(e);
        throw new Error(`Couldn't execute ${command}(${JSON.stringify(args)})`);
    }
};


/**
 * @param {Object} cfg The configuration object
 * @param { String } cfg.position The X,Y position where node is going to be added
 * @param { String } cfg.nodeFactory The representation of the node's factory
 * @param { String } cfg.projectId
 * @param { String } cfg.workflowId
 * @returns { Promise } Promise
 */
export const addNode = ({
    position, nodeFactory, projectId, workflowId
}) => workflowCommand({
    command: 'add_node',
    args: { position, nodeFactory },
    projectId,
    workflowId
});


/**
 * @param {Object} cfg The configuration object
 * @param { String } cfg.name The new name of the component or metanode
 * @param { String } cfg.nodeId Id of the node that will be updated
 * @param { String } cfg.projectId
 * @param { String } cfg.workflowId
 * @returns { Promise } Promise
 */
export const renameContainer = ({
    nodeId,
    name,
    projectId,
    workflowId
}) => workflowCommand({
    command: 'update_component_or_metanode_name',
    args: {
        nodeId,
        name
    },
    projectId,
    workflowId
});


/**
 * @param {Object} cfg The configuration object
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
 * @param {Object} cfg The configuration object
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
 * @param {Object} cfg The configuration object
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
 * @param {Object} cfg The configuration object
 * @param { String } cfg.projectId
 * @param { String } cfg.workflowId
 * @returns {Promise}
 */
export const undo = async ({ projectId, workflowId }) => {
    try {
        return await rpc(`WorkflowService.undoWorkflowCommand`, projectId, workflowId);
    } catch (e) {
        consola.error(e);
        throw new Error('Couldn\'t undo');
    }
};


/**
 * Performs a redo command
 * @param {Object} cfg The configuration object
 * @param { String } cfg.projectId
 * @param { String } cfg.workflowId
 * @returns {Promise}
 */
export const redo = async ({ projectId, workflowId }) => {
    try {
        return await rpc(`WorkflowService.redoWorkflowCommand`, projectId, workflowId);
    } catch (e) {
        consola.error(e);
        throw new Error('Couldn\'t redo');
    }
};
