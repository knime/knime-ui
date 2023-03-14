import { API } from '@api';

/**
 * Calls the 'getPortView' endpoint (see API documentation).
 * @param {String} projectId
 * @param {String} workflowId
 * @param {String} nodeId
 * @param {Number} portIdx
 * @returns {Promise}
 */
export const getPortView = async (
    { projectId, workflowId, nodeId, portIdx }:
    { projectId: string, workflowId: string, nodeId: string, portIdx: number }
) => {
    try {
        return await API.port.getPortView({
            projectId,
            workflowId,
            nodeId,
            portIdx
        });
    } catch (e) {
        consola.error(e);
        throw new Error(`Could not fetch port view for node ${nodeId} at port index ${portIdx}`);
    }
};

/**
 * Calls the 'callPortDataService' endpoint (see API documentation).
 * @param {String} projectId
 * @param {String} workflowId
 * @param {String} nodeId
 * @param {Number} portIdx
 * @param {String} serviceType
 * @param {String} request
 * @returns {Promise<String>}
 */
export const callPortDataService =
    async ({ projectId, workflowId, nodeId, portIdx, serviceType, request }) => {
        try {
            return await API.port.callPortDataService({
                projectId,
                workflowId,
                nodeId,
                portIdx,
                serviceType,
                dataServiceRequest: request
            });
        } catch (e) {
            consola.error(e);
            throw new Error(`Could not call port data service for node ${nodeId} at port index ${portIdx}`);
        }
    };
