import { workflowCommand } from './index';

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
