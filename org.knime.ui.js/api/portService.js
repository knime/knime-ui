import rpc from './json-rpc-adapter';

/**
 * Calls the 'getPortView' endpoint (see API documentation).
 *
 * @param {String} projectId
 * @param {String} workflowId
 * @param {String} nodeId
 * @param {Number} portIndex
 * @returns {Object}
 */
export const getPortView = async ({ projectId, workflowId, nodeId, portIndex }) => {
    try {
        return await rpc('PortService.getPortView', projectId, workflowId, nodeId, portIndex);
    } catch (e) {
        consola.error(e);
        throw new Error(`Could not fetch port view for node ${nodeId} at port index ${portIndex}`);
    }
};


/**
 * Calls the 'callPortDataService' endpoint (see API documentation).
 *
 * @param {String} projectId
 * @param {String} workflowId
 * @param {String} nodeId
 * @param {Number} portIndex
 * @param {String} serviceType
 * @param {String} request
 * @returns {String}
 */
export const callPortDataService =
    async ({ projectId, workflowId, nodeId, portIndex, serviceType, request }) => {
        try {
            return await rpc(
                'PortService.callPortDataService',
                projectId, workflowId, nodeId, portIndex, serviceType, request
            );
        } catch (e) {
            consola.error(e);
            throw new Error(`Could not call port data service for node ${nodeId} at port index ${portIndex}`);
        }
    };
