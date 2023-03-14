import { waitForPatch } from '@/util/event-syncer';
import { API } from '@api';

/**
 * Load a specific workflow.
 * @param { Object } cfg The configuration object
 * @param { String } cfg.projectId The ID of the project to load
 * @param { String } cfg.workflowId The ID of the component / metanode that contains the workflow, or "root" for the
 *   top-level workflow. Defaults to `'root'`.
 * @param { Boolean } cfg.includeInfoOnAllowedActions Whether to enclose information on the actions
 *   (such as reset, execute, cancel) allowed on the contained nodes and the entire workflow itself.
 Defaults to `true`.
 * @return { Promise<WorkflowSnapshot> } A promise containing the workflow as defined in the API
 */
export const loadWorkflow = async ({ projectId, workflowId = 'root', includeInfoOnAllowedActions = true }) => {
    try {
        const workflow = await API.workflow.getWorkflow({
            projectId,
            workflowId,
            includeInteractionInfo: includeInfoOnAllowedActions
        });
        consola.debug('Loaded workflow', workflow);

        return workflow;
    } catch (e) {
        consola.error(e);
        throw new Error(`Couldn't load workflow "${workflowId}" from project "${projectId}"`);
    }
};

/**
 * Generates workflow commands that are part of the undo/redo stack
 * @param {*} responseSupplier The command to execute
 * @param {*} commandName The name of the executed command
 * @returns {Promise} Maybe empty, since some commands don't return a result
 */
const workflowCommand = async (responseSupplier, commandName) => { // TODO: This deserves a better name
    try {
        let response = await responseSupplier();

        if (!response || !response.snapshotId) {
            return response;
        }

        await waitForPatch(response.snapshotId);
        
        return response;
    } catch (e) {
        consola.error(e);
        throw new Error(`Couldn't execute ${commandName}`);
    }
};

// Disable arrow-body-style for workflow commands to be more flexible
/* eslint-disable arrow-body-style */

/**
 * Adds a node to the canvas
 * @param { String } position The X,Y position where node is going to be added
 * @param { String } nodeFactory The representation of the node's factory
 * @param { String } projectId
 * @param { String } workflowId
 * @param { Object } spaceItemReference The global id of the space item (optional)
 * @param { String } sourceNodeId
 * @param { Number } sourcePortIdx
 * @returns { Promise } Promise
 */
export const addNode = ({
    position,
    nodeFactory,
    projectId,
    workflowId,
    spaceItemReference,
    sourceNodeId = null,
    sourcePortIdx = null
}) => workflowCommand(() => API.workflowCommand.AddNode({ // TODO: Fix linter, this is fine
    position,
    nodeFactory,
    projectId,
    workflowId,
    spaceItemReference,
    sourceNodeId,
    sourcePortIdx
}), 'add_node');

/**
 * Renames a container node
 * @param { String } name The new name of the component or metanode
 * @param { String } nodeId Id of the node that will be updated
 * @param { String } projectId
 * @param { String } workflowId
 * @returns { Promise } Promise
 */
export const renameContainerNode = ({ nodeId, name, projectId, workflowId }) => {
    return workflowCommand(() => API.workflowCommand.UpdateComponentOrMetanodeName({
        projectId,
        workflowId,
        nodeId,
        name
    }), 'update_component_or_metanode_name');
};

/**
 * Renames a native node
 * @param { String } label The new label of the node
 * @param { String } nodeId Id of the node that will be updated
 * @param { String } projectId
 * @param { String } workflowId
 * @returns { Promise } Promise
 */
export const renameNodeLabel = ({ nodeId, label, projectId, workflowId }) => {
    return workflowCommand(() => API.workflowCommand.UpdateNodeLabel({
        projectId,
        workflowId,
        nodeId,
        label
    }), 'update_node_label');
};

/**
 * Deletes an object
 * @param { String } projectId
 * @param { String } workflowId
 * @param { Array } nodeIds The nodes to be deleted
 * @param { Array } annotationIds The annotations to be deleted
 * @param { Array } connectionIds The connections to be deleted
 * @returns { Promise } Promise
 */
export const deleteObjects = ({ nodeIds = [], annotationIds = [], connectionIds = [], projectId, workflowId }) => {
    return workflowCommand(() => API.workflowCommand.Delete({
        nodeIds,
        annotationIds,
        connectionIds,
        projectId,
        workflowId
    }, 'delete'));
};

/**
 * Moves an object on the canvas
 * @param { String } projectId
 * @param { String } workflowId
 * @param { Array } nodeIds The nodes to be moved
 * @param { Array } annotationIds The annotations to be moved
 * @param { Array } translation the translation by which the objects are to be moved
 * @returns { Promise } Promise
 */
export const moveObjects = ({ projectId, workflowId, nodeIds = [], translation, annotationIds = [] }) => {
    return workflowCommand(() => API.workflowCommand.Translate({
        projectId,
        workflowId,
        nodeIds,
        annotationIds,
        translation
    }), 'translate');
};

/**
 * Connects two nodes
 * @param { String } projectId
 * @param { String } workflowId
 * @param { String } sourceNode node with outPort
 * @param { String } destNode   node with inPort
 * @param { Number } sourcePort index of outPort
 * @param { Number } destPort   index of inPort
 * @returns { Promise } Promise
 */
export const connectNodes = ({ projectId, workflowId, sourceNode, sourcePort, destNode, destPort }) => {
    return workflowCommand(() => API.workflowCommand.Connect({
        projectId,
        workflowId,
        sourceNodeId: sourceNode,
        sourcePortIdx: sourcePort,
        destinationNodeId: destNode,
        destinationPortIdx: destPort
    }), 'connect');
};

/**
 * Performs an undo command
 * @param { String } projectId
 * @param { String } workflowId
 * @returns { Promise }
 */
export const undo = async ({ projectId, workflowId }) => {
    try {
        return await API.workflow.undoWorkflowCommand({
            projectId,
            workflowId
        });
    } catch (e) {
        consola.error(e);
        throw new Error('Couldn\'t undo');
    }
};

/**
 * Performs a redo command
 * @param { String } projectId
 * @param { String } workflowId
 * @returns { Promise }
 */
export const redo = async ({ projectId, workflowId }) => {
    try {
        return await API.workflow.redoWorkflowCommand({
            projectId,
            workflowId
        });
    } catch (e) {
        consola.error(e);
        throw new Error('Couldn\'t redo');
    }
};

/**
 * Creates a metanode or component
 * @param { String } projectId
 * @param { String } workflowId
 * @param { 'metanode' | 'component' } containerType
 * @param { Array } nodeIds
 * @param { Array } annotationIds
 * @returns {Promise}
 */
export const collapseToContainer = ({ projectId, workflowId, containerType, nodeIds = [], annotationIds = [] }) => {
    return workflowCommand(() => API.workflowCommand.Collapse({
        projectId,
        workflowId,
        containerType,
        nodeIds,
        annotationIds
    }), 'collapse');
};

/**
 * Adds a port to a node
 * @param { String } projectId
 * @param { String } workflowId
 * @param { String } nodeId
 * @param { String } portType
 * @param { 'input' | 'output' } side
 * @returns { Promise }
 */
export const addNodePort = ({ projectId, workflowId, nodeId, side, portGroup, typeId }) => {
    return workflowCommand(() => API.workflowCommand.AddPort({
        projectId,
        workflowId,
        nodeId,
        side,
        portGroup,
        portTypeId: typeId
    }), 'add_port');
};

/**
 * Removes a port from a node
 * @param { String } projectId
 * @param { String } workflowId
 * @param { String } nodeId
 * @param { 'input' | 'output' } side
 * @param { Number } index
 * @param { String } portGroup
 * @returns { Promise }
 */
export const removeNodePort = ({ projectId, workflowId, nodeId, side, index, portGroup }) => {
    return workflowCommand(() => API.workflowCommand.RemovePort({
        projectId,
        workflowId,
        nodeId,
        side,
        portGroup,
        portIndex: index
    }), 'remove_port');
};

/**
 * Expands a metanode or component
 * @param { String } projectId
 * @param { String } workflowId
 * @param { String } nodeId
 * @returns { Promise }
 */
export const expandContainerNode = ({ projectId, workflowId, nodeId }) => {
    return workflowCommand(() => API.workflowCommand.Expand({
        projectId,
        workflowId,
        nodeId
    }), 'expand');
};

/**
 * Copies or cuts workflow parts and serializes them
 * @param { String } projectId
 * @param { String } workflowId
 * @param { 'copy' | 'cut' } command The command to execute, can be 'copy' or 'cut'
 * @param { Array } nodeIds The node ids to copy
 * @param { Array } annotationIds The annotation ids to copy
 * @returns { Promise } The serialized workflow parts
 */
export const copyOrCutWorkflowParts = ({ projectId, workflowId, command, nodeIds = [], annotationIds = [] }) => {
    const params = {
        projectId,
        workflowId,
        nodeIds,
        annotationIds
    };
    return workflowCommand(() => command === 'copy'
        ? API.workflowCommand.Copy(params)
        : API.workflowCommand.Cut(params));
};

/**
 * Pastes workflow parts to the canvas
 * @param { String } projectId
 * @param { String } workflowId
 * @param { Object } content Workflow parts to be pasted
 * @param { Object } position Paste the workflow parts at this position
 * @returns { void }
 */
export const pasteWorkflowParts = ({ projectId, workflowId, content = {}, position }) => {
    return workflowCommand(() => API.workflowCommand.Paste({
        projectId,
        workflowId,
        content,
        position
    }), 'paste');
};
