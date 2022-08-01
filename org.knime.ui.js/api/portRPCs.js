// TODO entire file to be removed with NXT-632
import { callPortDataService } from './nodeService.js';

const toJsonRpcString = (method, params = []) => JSON.stringify({
    jsonrpc: '2.0',
    id: 0,
    method,
    params
});

/**
 * Get the data table associated with a data port.
 * @param {String} projectId The ID of the project that contains the node
 * @param {String} nodeId The ID of the node to load data for
 * @param {String} workflowId The ID of the workflow containing the node
 * @param {String} portIndex The index of the port to load data for.
 * @param {String} offset The index of the first row to be loaded
 * @param {String} batchSize The amount of rows to be loaded. Must be smallEq than 450
 * Remember that port 0 is usually a flow variable port.
 * @return {Promise} A promise containing the table data as defined in the API
 * */
export const loadTable = async ({ projectId, workflowId, nodeId, portIndex, offset = 0, batchSize }) => {
    try {
        return JSON.parse(await callPortDataService(
            projectId,
            workflowId,
            nodeId,
            portIndex,
            'data',
            toJsonRpcString('getTable', [offset, batchSize])
        )).result;
    } catch (e) {
        consola.error(e);
        throw new Error(
            `Couldn't load table data (start: ${offset}, length: ${batchSize}) ` +
            `from port ${portIndex} of node "${nodeId}" in project ${projectId}`
        );
    }
};
