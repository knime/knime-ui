let parseResponse;

/**
 * Call the JSON-RPC API as defined
 * in knime-com-shared/src/master/com.knime.gateway.codegen/src-gen/api/web-ui/gateway.yaml
 * This API gets injected into the global object as `jsonrpc()`.
 *
 * @param {String} method The method to be called
 * @param {*} args Arguments for the called method
 * @example
 *   rpc('WorkflowService.getWorkflow', 'foo', 'bar');
 *
 * @returns {Promise} A promise containing The result of the JSON-RPC call, as defined in
 *   https://www.jsonrpc.org/specification.
 *
 * @private
 */
export default (method, ...args) => {
    const req = {
        jsonrpc: '2.0',
        method,
        params: args,
        id: 0
    };
    consola.trace('JSON-RPC:', req);

    let response;
    try {
        response = window.jsonrpc(JSON.stringify(req));
    } catch (e) {
        throw new Error(`Error calling JSON-RPC api "${[method, JSON.stringify(args)].join('", "')}": ${e.message}`);
    }

    return parseResponse({ response, method, args });
};

/**
 * Helper to parse a JSON-RPC response. Throws an Error if the response is invalid
 * @param {String} response The serialized JSON-RPC response
 * @param {String} method (only for logging) The method that was called
 * @param {Array} args (only for logging) The arguments that were passed to the method
 * @returns {*} The `result` contained in the JSON-RPC object
 * */
parseResponse = ({ response, method = '<unknown>', args }) => {
    let result, error;
    try {
        ({ result, error } = JSON.parse(response));
    } catch (e) {
        throw new Error(`Could not be parsed as JSON-RPC: ${response}`);
    }

    if (error) {
        if (result) {
            consola.error(`Invalid JSON-RPC response ${response}`);
        }
        throw new Error(
            `Error returned from JSON-RPC API ${JSON.stringify([method, args])}: ${JSON.stringify(error)}`
        );
    }

    if (typeof result === 'undefined') {
        throw new Error(`Invalid JSON-RPC response ${response}`);
    }

    consola.trace('Result:', result);
    return result;
};

export { parseResponse };
