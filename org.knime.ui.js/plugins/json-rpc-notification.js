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
     * @param {String} json A Serialized JSON-RPC request object
     *   The available methods are listed in store/jsonrpc.js
     * @returns {String} A Serialized JSON-RPC response object
     */
    window.jsonrpcNotification = function (json, ...other) {
        if (typeof json !== 'string' || other.length > 0) {
            consola.error(genericErrorMsg);
            throw new TypeError(genericErrorMsg);
        }

        consola.verbose('JSON-RPC notification', json);

        let jsonrpc, method, params, id;

        try {
            ({ jsonrpc, method, params, id } = JSON.parse(json));
        } catch (e) {
            consola.error(e);
            // TODO: NXT-275 / NXT-337 handle error in frontend
            let errorDescriptor = {
                jsonrpc: '2.0',
                id: null,
                error: {
                    code: errorCodes.parseError,
                    message: genericErrorMsg
                }
            };
            consola.error(errorDescriptor);
            return JSON.stringify(errorDescriptor);
        }

        let idIsValid = typeof id === 'undefined' || id === null || typeof id === 'string' || typeof id === 'number';
        let isValid = jsonrpc === '2.0' && typeof method === 'string' &&
            (!params || Array.isArray(params)) && idIsValid;
        if (!isValid) {
            // TODO: NXT-275 / NXT-337 handle error in frontend
            let errorDescriptor = {
                jsonrpc: '2.0',
                id: idIsValid ? id : null,
                error: {
                    code: errorCodes.invalidRequest,
                    message: 'Invalid JSON-RPC format'
                }
            };
            consola.error(errorDescriptor);
            return JSON.stringify(errorDescriptor);
        }

        if (!actions.hasOwnProperty(method)) {
            // TODO: NXT-275 / NXT-337 handle error in frontend
            let errorDescriptor = {
                jsonrpc: '2.0',
                id,
                error: {
                    code: errorCodes.methodNotFound,
                    message: `Method "${method}" not found`
                }
            };
            consola.error(errorDescriptor);
            return JSON.stringify(errorDescriptor);
        }

        try {
            context.store.dispatch(`jsonrpc/${method}`, params);
            return JSON.stringify({
                jsonrpc: '2.0',
                id,
                result: 'ok'
            });
        } catch (e) {
            consola.error(e);
            return JSON.stringify({
                jsonrpc: '2.0',
                id,
                error: {
                    code: -32603,
                    message: e.message,
                    data: e.stack
                }
            });
        }
    };
    window.context = context;
};
