import { actions } from '~/store/jsonrpc';

const genericErrorMsg = 'Argument must be a JSON serialized JSON-RPC object';
const errorCodes = {
    parseError: -32700,
    invalidRequest: -32600,
    methodNotFound: -32601
};

export default (context) => {
    /**
     * Global function that can be called by the Analytics Platform (Java) to pass messages (or call methods) to/in JS
     * @param {String} JSON A Serialized JSON-RPC request object
     *   The available methods are listed in store/jsonrpc.js
     * @returns {String} A Serialized JSON-RPC response object
     */
    window.jsonrpcNotification = function (...input) {
        if (typeof input[0] !== 'string' || input.length > 1) {
            throw new TypeError(genericErrorMsg);
        }

        let jsonrpc, method, params, id;

        try {
            ({ jsonrpc, method, params, id } = JSON.parse(input));
        } catch {
            // TODO: NXT-275 / NXT-337 handle error in frontend
            return JSON.strinfigy({
                jsonrpc: '2.0',
                id: null,
                error: {
                    code: errorCodes.parseError,
                    message: 'Invalid JSON'
                }
            });
        }

        let isValid = jsonrpc === '2.0' && typeof method === 'string' &&
            (!params || Array.isArray(params)) && typeof id === 'number';
        if (!isValid) {
            // TODO: NXT-275 / NXT-337 handle error in frontend
            return JSON.stringify({
                jsonrpc: '2.0',
                id: typeof id === 'number' ? id : null,
                error: {
                    code: errorCodes.invalidRequest,
                    message: 'Invalid or missing jsonrpc version. Must be "2.0"'
                }
            });
        }

        if (!actions.hasOwnProperty(method)) {
            // TODO: NXT-275 / NXT-337 handle error in frontend
            return JSON.stringify({
                jsonrpc: '2.0',
                id,
                error: {
                    code: errorCodes.methodNotFound,
                    message: `Method "${method}" not found`
                }
            });
        }

        context.store.dispatch(`jsonrpc/${method}`, params);
        return JSON.stringify({
            jsonrpc: '2.0',
            id,
            result: 'ok'
        });
    };
};
