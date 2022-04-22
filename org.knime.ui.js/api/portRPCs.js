import rpc, { handleResponse } from './json-rpc-adapter.js';

// The Node service offers JSON-RPC forwarding to the Port instance.
// This is by design, because third-party vendors can provide a custom port implementation with totally
// different methods. In case of a data port (table), the available methods are defined in
// org.knime.gateway.impl.rpc.*.*Service
// (at the time of writing getTable(long start, int size), getRows(long start, int size), and getFlowVariables())
// So, to get a table we have to send a JSON-RPC object as a payload to the NodeService, which itself must be called via
// JSON-RPC. Hence double-wrapping is required.
// Parameters are described below.
const portRPC = async ({ method, params, projectId, workflowId, nodeId, portIndex }) => {
    let nestedRpcCall = {
        jsonrpc: '2.0',
        id: 0,
        method,
        params
    };
    let response = await rpc('NodeService.doPortRpc',
        projectId,
        workflowId,
        nodeId,
        portIndex,
        JSON.stringify(nestedRpcCall));
    return handleResponse({ response, method, params });
};

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
        return await portRPC({
            projectId,
            nodeId,
            workflowId,
            portIndex,
            method: 'getTable',
            params: [offset, batchSize]
        });
    } catch (e) {
        consola.error(e);
        throw new Error(
            `Couldn't load table data (start: ${offset}, length: ${batchSize}) ` +
            `from port ${portIndex} of node "${nodeId}" in project ${projectId}`
        );
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
export const loadFlowVariables = async ({ projectId, workflowId, nodeId, portIndex }) => {
    try {
        return await portRPC({
            projectId,
            workflowId,
            nodeId,
            portIndex,
            method: 'getFlowVariables'
        });
    } catch (e) {
        consola.error(e);
        throw new Error(
            `Couldn't load flow variables of node "${nodeId}" in project ${projectId}`
        );
    }
};
