import { waitForPatch } from '@/util/event-syncer';
import rpc from './json-rpc-adapter';

/**
 * Load a specific workflow.
 * @param { Object } cfg The configuration object
 * @param { String } cfg.projectId The ID of the project to load
 * @param { String } cfg.workflowId The ID of the component / metanode that contains the workflow, or "root" for the
 *   top-level workflow. Defaults to `'root'`.
 * @param { Boolean } cfg.includeInfoOnAllowedActions Whether to enclose information on the actions
 *   (such as reset, execute, cancel) allowed on the contained nodes and the entire workflow itself.
 Defaults to `true`.
 * @return { Promise } A promise containing the workflow as defined in the API
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
 * @param { Object } cfg The configuration object
 * @param { String } cfg.projectId
 * @param { String } cfg.workflowId
 * @param { String } cfg.command name of the command to be executed
 * @param { String } cfg.args arguments for the command
 * @returns { Promise }
 */
const workflowCommand = async ({ projectId, workflowId, command, args }) => {
    try {
        let rpcArgs = { kind: command, ...args };
        let response = await rpc(`WorkflowService.executeWorkflowCommand`, projectId, workflowId, rpcArgs);

        if (!response || !response.snapshotId) {
            return response;
        }

        await waitForPatch(response.snapshotId);

        return response;
    } catch (e) {
        consola.error(e);
        throw new Error(`Couldn't execute ${command}(${JSON.stringify(args)})`);
    }
};

// Disable arrow-body-style for workflow commands to be more flexible
/* eslint-disable arrow-body-style */

/**
 * @param { Object } cfg The configuration object
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
 * @param { Object } cfg The configuration object
 * @param { String } cfg.name The new name of the component or metanode
 * @param { String } cfg.nodeId Id of the node that will be updated
 * @param { String } cfg.projectId
 * @param { String } cfg.workflowId
 * @returns { Promise } Promise
 */
export const renameContainerNode = ({
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
 * @param { Object } cfg The configuration object
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
 * @param { Object } cfg The configuration object
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
 * @param { Object } cfg The configuration object
 * @param { String } cfg.projectId
 * @param { String } cfg.workflowId
 * @param { String } cfg.sourceNode node with outPort
 * @param { String } cfg.destNode   node with inPort
 * @param { String } cfg.sourcePort index of outPort
 * @param { String } cfg.destPort   index of inPort
 * @returns { Promise } Promise
 */
export const connectNodes = ({ projectId, workflowId, sourceNode, sourcePort, destNode, destPort }) => {
    return workflowCommand({
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
};


/**
 * Performs an undo command
 * @param { Object } cfg The configuration object
 * @param { String } cfg.projectId
 * @param { String } cfg.workflowId
 * @returns { Promise }
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
 * @param { Object } cfg The configuration object
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

/**
 * Creates a metanode or component
 * @param { String } cfg.projectId
 * @param { String } cfg.workflowId
 * @param { 'metanode' | 'component' } cfg.containerType
 * @param { Array } cfg.nodeIds
 * @param { Array } cfg.annotationIds
 * @returns {Promise}
 */
export const collapseToContainer = ({
    projectId, workflowId, containerType, nodeIds = [], annotationIds = []
}) => workflowCommand({
    command: 'collapse',
    args: { containerType, nodeIds, annotationIds },
    projectId,
    workflowId
});

/**
 * Adds a port to a node
 * @param { String } cfg.projectId
 * @param { String } cfg.workflowId
 * @param { String } cfg.nodeId
 * @param { String } cfg.portType
 * @param { 'input' | 'output' } cfg.side
 * @returns { Promise }
 */
export const addNodePort = ({ projectId, workflowId, nodeId, side, portGroup, typeId }) => {
    return workflowCommand({
        command: 'add_port',
        args: { nodeId, side, portGroup, portTypeId: typeId },
        projectId,
        workflowId
    });
};

/**
 * Removes a port from a node
 * @param { String } cfg.projectId
 * @param { String } cfg.workflowId
 * @param { String } cfg.nodeId
 * @param { 'input' | 'output' } cfg.side
 * @param { Number } cfg.index
 * @param { String } cfg.portGroup
 * @returns { Promise }
 */
export const removeNodePort = ({ projectId, workflowId, nodeId, side, index, portGroup }) => workflowCommand({
    command: 'remove_port',
    args: { nodeId, side, portIndex: index, portGroup },
    projectId,
    workflowId
});

/**
 * Expands a metanode or component
 * @param { String } cfg.projectId
 * @param { String } cfg.workflowId
 * @param { String } cfg.nodeId
 * @returns {Promise}
 */
export const expandContainerNode = ({ projectId, workflowId, nodeId }) => workflowCommand({
    command: 'expand',
    args: { nodeId },
    projectId,
    workflowId
});

/**
 * Copies or cuts workflow parts and serializes them
 * @param { String } cfg.projectId
 * @param { String } cfg.workflowId
 * @param { 'copy' | 'cut' } cfg.command The command to execute, can be 'copy' or 'cut'
 * @param { Array } cfg.nodeIds The node ids to copy
 * @param { Array } cfg.annotationIds The annotation ids to copy
 * @returns { Promise } The serialized workflow parts
 */
export const copyOrCutWorkflowParts = ({ projectId, workflowId, command, nodeIds = [], annotationIds = [] }) => {
    return workflowCommand({
        command,
        args: { nodeIds, annotationIds },
        projectId,
        workflowId
    });
};

/**
 * Pastes workflow parts to the canvas
 * @param { String } cfg.projectId
 * @param { String } cfg.workflowId
 * @param { Object } content Workflow parts to be pasted
 * @param { Object } position Paste the workflow parts at this position
 * @returns { void }
 */
export const pasteWorkflowParts = ({
    projectId, workflowId, content = {}, position
}) => workflowCommand({
    command: 'paste',
    args: { content, position },
    projectId,
    workflowId
});
