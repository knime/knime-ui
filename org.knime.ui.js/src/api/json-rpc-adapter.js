/**
 * Helper to parse and verify a JSON-RPC response. Throws an Error if the response is invalid
 * @param {String | Object} response The JSON-RPC response, serialized or as object
 * @param {String} method (only for logging) The method that was called
 * @param {Array} args (only for logging) The arguments that were passed to the method
 * @returns {*} The `result` contained in the JSON-RPC object
 * */
export const handleResponse = ({ response, method = '<unknown>', args }) => {
    // parse response, if it is serialized
    if (typeof response === 'string') {
        try {
            response = JSON.parse(response);
        } catch (e) {
            throw new Error(`Could not be parsed as JSON-RPC: ${response}`);
        }
    }

    // check validity of JSON-RPC response
    let { result, error: originalError } = response;
    if (originalError) {
        if (result) {
            consola.error(`Invalid JSON-RPC response: Both error and result exist.\n${JSON.stringify(response)}`);
        }
        const error = new Error(
            `Error returned from JSON-RPC API ${JSON.stringify([method, args])}: ${JSON.stringify(originalError)}`
        );
        error.originalError = originalError;
        throw error;
    } else if (typeof result === 'undefined') {
        throw new Error(`Invalid JSON-RPC response: Neither error nor result exist.\n${JSON.stringify(response)}`);
    }

    consola.trace('JSON-RPC Result:', result);
    return result;
};

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
export default async (method, ...args) => {
    const req = {
        jsonrpc: '2.0',
        method,
        params: args,
        id: 0
    };
    consola.trace('JSON-RPC Request:', req);

    let response;
    try {
        response = window.jsonrpc(req);
        if (response instanceof Promise) {
            consola.trace('using synchronous backend');
            response = await response;
        }
    } catch (e) {
        throw new Error(`Error calling JSON-RPC api "${[method, JSON.stringify(args)].join('", "')}": ${e.message}`);
    }

    return handleResponse({ response, method, args });
};
