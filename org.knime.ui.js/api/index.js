import consola from 'consola';
import rpc, { parseResponse } from './json-rpc-adapter.js';

/**
 * Fetch "application state", that is: opened tabs etc.
 * This is designed to be called on application startup.
 * @return {Promise} A promise containing the application state as defined in the API
 */
export const fetchApplicationState = () => {
    try {
        const state = rpc('ApplicationService.getState');
        consola.debug('Current app state', state);

        return Promise.resolve(state);
    } catch (e) {
        consola.error(e);
        return Promise.reject(new Error('Could not load application state'));
    }
};

/**
 * Load a specific workflow.
 * @param {String} projectId The ID of the project to load
 * @param {String} containerId The ID of the component / metanode that contains the workflow, or "root" for the
 *   top-level workflow. Defaults to `'root'`.
 * @param {String} includeInfoOnAllowedActions Whether to enclose information on the actions
 *   (such as reset, execute, cancel) allowed on the contained nodes and the entire workflow itself.
 Defaults to `true`.
 * @return {Promise} A promise containing the workflow as defined in the API
 */
export const loadWorkflow = (projectId, containerId = 'root', includeInfoOnAllowedActions = true) => {
    try {
        const workflow = rpc('WorkflowService.getWorkflow', projectId, containerId, includeInfoOnAllowedActions);
        consola.debug('Loaded workflow', workflow);

        return Promise.resolve(workflow);
    } catch (e) {
        consola.error(e);
        return Promise.reject(new Error(`Couldn't load workflow "${containerId}" from project "${projectId}"`));
    }
};

// The Node service offers JSON-RPC forwarding to the Port instance.
// This is by design, because third-party vendors can provide a custom port implementation with totally
// different methods. In case of a data port (table), the available methods are defined in
// org.knime.gateway.impl.rpc.table.TableService
// (at the time of writing getTable(long start, int size) and getRows(long start, int size))
// So, to get a table we have to send a JSON-RPC object as a payload to the NodeService, which itself must be called via
// JSON-RPC. Hence double-wrapping is required.
// Parameters are described below.
const nestedRpcCall = ({ method, params, projectId, nodeId, portIndex }) => {
    let nestedRpcCall = {
        jsonrpc: '2.0',
        id: 0,
        method,
        params
    };
    let response = rpc('NodeService.doPortRpc', projectId, nodeId, portIndex, JSON.stringify(nestedRpcCall));
    return parseResponse({ response, method, params });
};

/**
 * Get the data table associated with a data port.
 * @param {String} projectId The ID of the project that contains the node
 * @param {String} nodeId The ID of the node to load data for
 * @param {String} portIndex The index of the port to load data for.
 * Remember that port 0 is usually a flow variable port.
 * @return {Promise} A promise containing the table data as defined in the API
 * */
export const loadTable = ({ projectId, nodeId, portIndex }) => {
    const rowCount = 400; // The backend is limited to 500-50=450, see org.knime.core.data.cache.WindowCacheTable
    try {
        let table = nestedRpcCall({
            projectId,
            nodeId,
            portIndex,
            method: 'getTable',
            params: [0, rowCount]
        });
        return Promise.resolve(table);
    } catch (e) {
        consola.error(e);
        return Promise.reject(new Error(
            `Couldn't load table data from port ${portIndex} of node "${nodeId}" in project ${projectId}`
        ));
    }
};
