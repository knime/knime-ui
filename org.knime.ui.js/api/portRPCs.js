import { portRPC } from './index';

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
export const loadTable = ({ projectId, workflowId, nodeId, portIndex, offset = 0, batchSize }) => {
    try {
        let table = portRPC({
            projectId,
            nodeId,
            workflowId,
            portIndex,
            method: 'getTable',
            params: [offset, batchSize]
        });
        return Promise.resolve(table);
    } catch (e) {
        consola.error(e);
        return Promise.reject(new Error(
            `Couldn't load table data (start: ${offset}, length: ${batchSize}) ` +
            `from port ${portIndex} of node "${nodeId}" in project ${projectId}`
        ));
    }
};

/**
 * Get the flow variables associated with a flow variable port.
 * @param {String} projectId The ID of the project that contains the node
 * @param {String} nodeId The ID of the node to load variables for
 * @param {String} workflowId The ID of the workflow containing the node
 * @param {String} portIndex The index of the port to load variables for.
 * Remember that port 0 is usually a flow variable port.
 * @return {Promise} A promise containing the flow variable data as defined in the API
 * */
export const loadFlowVariables = ({ projectId, workflowId, nodeId, portIndex }) => {
    try {
        let flowVariables = portRPC({
            projectId,
            workflowId,
            nodeId,
            portIndex,
            method: 'getFlowVariables'
        });
        return Promise.resolve(flowVariables);
    } catch (e) {
        consola.error(e);
        return Promise.reject(new Error(
            `Couldn't load flow variables of node "${nodeId}" in project ${projectId}`
        ));
    }
};
