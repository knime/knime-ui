/* eslint-disable valid-jsdoc */
import type { JSONRPCRequest, JSONRPCErrorResponse, JSONRPCError, JSONRPCID } from './types';
import { JSONRPC, ErrorCodes, isJSONRPCID } from './types';

type MaybeValidJSONRPC = { isValid: boolean, response: JSONRPCRequest | JSONRPCErrorResponse }

const GENERIC_ERROR_MESSAGE = 'Argument must be a JSON serialized JSON-RPC object';

const COMPOSED_EVENT_NAME = 'ComposedEvent';

const REGISTERED_HANDLERS = new Map<string, Function>();

const createJSONRPCError = (
    code: number,
    message: string,
    data?: any
): JSONRPCError => {
    const error: JSONRPCError = { code, message };

    if (data !== null) {
        error.data = data;
    }

    return error;
};

const createJSONRPCErrorResponse = (
    id: JSONRPCID,
    code: number,
    message: string,
    data?: any
): JSONRPCErrorResponse => {
    consola.error(message);

    return {
        jsonrpc: JSONRPC,
        id,
        error: createJSONRPCError(code, message, data)
    };
};

const tryParse = (json: string): MaybeValidJSONRPC => {
    try {
        const parsed = JSON.parse(json) as JSONRPCRequest;
        return { isValid: true, response: parsed };
    } catch (error) {
        const errorResponse = createJSONRPCErrorResponse(
            null,
            ErrorCodes.parseError,
            GENERIC_ERROR_MESSAGE
        );
        return { isValid: false, response: errorResponse };
    }
};

const validateFormat = (data: MaybeValidJSONRPC): MaybeValidJSONRPC => {
    if (!data.isValid) {
        return data;
    }

    const { id, jsonrpc, method } = data.response as JSONRPCRequest;

    const isValid = isJSONRPCID(id) && jsonrpc === JSONRPC && typeof method === 'string';

    const response = isValid
        ? data.response as JSONRPCRequest
        : createJSONRPCErrorResponse(
            isJSONRPCID(id) ? id : null,
            ErrorCodes.invalidRequest,
            'Invalid JSON-RPC format'
        );

    return { isValid, response };
};

const isComposedEvent = (method) => method.includes(':');

const getComposedEvents = (method) => method.split(':');

const validateComposedEvents = (method) => {
    const methods = getComposedEvents(method);
    let isValid = Boolean(REGISTERED_HANDLERS.get(COMPOSED_EVENT_NAME)) &&
        typeof REGISTERED_HANDLERS.get(COMPOSED_EVENT_NAME) === 'function';

    methods.forEach(method => {
        isValid = isValid && Boolean(REGISTERED_HANDLERS.get(method)) &&
            typeof REGISTERED_HANDLERS.get(method) === 'function';
    });
    return isValid;
};

const validateMethod = (data: MaybeValidJSONRPC): MaybeValidJSONRPC => {
    if (!data.isValid) {
        return data;
    }

    const { id, method } = data.response as JSONRPCRequest;

    let isValid;
    if (isComposedEvent(method)) {
        isValid = validateComposedEvents(method);
    } else {
        isValid = Boolean(REGISTERED_HANDLERS.get(method)) && typeof REGISTERED_HANDLERS.get(method) === 'function';
    }

    const response = isValid
        ? data.response
        : createJSONRPCErrorResponse(id, ErrorCodes.methodNotFound, `Method "${method}" not found`);

    return { isValid, response };
};

const validate = (json: string): MaybeValidJSONRPC => {
    const maybeParsed = tryParse(json);
    const maybeRpcRequest = validateFormat(maybeParsed);
    const maybeMethodFound = validateMethod(maybeRpcRequest);

    return maybeMethodFound;
};

export const getRegisteredNotificationHandler = (eventName: string) => REGISTERED_HANDLERS.get(eventName);

export const registerNotificationHandler = (eventName: string, handler: Function) => {
    REGISTERED_HANDLERS.set(eventName, handler);
};

export const jsonrpcNotification = function (json: string, ...other: unknown[]) {
    if (typeof json !== 'string' || other.length > 0) {
        consola.error(GENERIC_ERROR_MESSAGE);
        throw new TypeError(GENERIC_ERROR_MESSAGE);
    }

    consola.log('JSON-RPC notification', json);

    const { isValid, response } = validate(json);
    if (!isValid) {
        return JSON.stringify(response);
    }

    const { id, method, params } = response as JSONRPCRequest;
    try {
        let handlerName, handlerParams;

        if (isComposedEvent(method)) {
            handlerName = COMPOSED_EVENT_NAME;
            // parse the event params for each event of the composed event
            handlerParams =
                [{ events: getComposedEvents(method), params: params[0].events, eventHandlers: REGISTERED_HANDLERS }];
        } else {
            handlerName = method;
            handlerParams = params;
        }

        const handler = REGISTERED_HANDLERS.get(handlerName);
        handler(...handlerParams);
        
        return JSON.stringify({
            jsonrpc: JSONRPC,
            id,
            result: 'ok'
        });
    } catch (error) {
        consola.error('JSON-RPC handler error', error);
        const rpcError = createJSONRPCErrorResponse(
            id,
            ErrorCodes.internalError,
            error.message,
            error.stack
        );
        return JSON.stringify(rpcError);
    }
};

export const initJsonRpcNotifications = () => {
    window.jsonrpcNotification = jsonrpcNotification;
};
