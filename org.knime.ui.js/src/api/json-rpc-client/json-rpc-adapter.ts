// eslint-disable-next-line object-curly-newline
import {
    JSONRPC,
    type JSONRPCRequest,
    type JSONRPCResponse,
    type JSONRPCParams
// eslint-disable-next-line object-curly-newline
} from './types';

type WrappedError = Error & { originalError: Error };

const createWrappedError = (message: string, originalError: any): WrappedError => {
    const error: Partial<WrappedError> = new Error(message);

    error.originalError = originalError;
    return error as WrappedError;
};

const parseResponse = (response: string | JSONRPCResponse): JSONRPCResponse => {
    // parse response, if it is serialized
    if (typeof response === 'string') {
        try {
            return JSON.parse(response) as JSONRPCResponse;
        } catch (error) {
            throw createWrappedError(`Could not be parsed as JSON-RPC: ${response}`, error);
        }
    }

    return response as JSONRPCResponse;
};

const validateResponse = (
    { maybeResponse, method, params }: { maybeResponse: JSONRPCResponse; method: string; params: JSONRPCParams }
): JSONRPCResponse => {
    const { result, error: originalError } = maybeResponse;

    // eslint-disable-next-line @typescript-eslint/no-extra-parens
    if ((!originalError && result) || result === null) {
        return maybeResponse as JSONRPCResponse;
    }

    if (result) {
        consola.error(`Invalid JSON-RPC response: Both error and result exist.\n${JSON.stringify(maybeResponse)}`);

        throw createWrappedError(
            `Error returned from JSON-RPC API ${JSON.stringify([method, params])}: ${JSON.stringify(originalError)}`,
            originalError
        );
    }

    if (originalError) {
        throw createWrappedError(
            `Error returned from JSON-RPC API ${JSON.stringify([method, params])}: ${JSON.stringify(originalError)}`,
            originalError
        );
    }

    if (typeof result === 'undefined') {
        throw createWrappedError(
            `Invalid JSON-RPC response: Neither error nor result exist.\n${JSON.stringify(maybeResponse)}`,
            originalError
        );
    }

    throw originalError;
};

const handleResponse = (
    { response, method = '<unknown>', params }:
    { response: string | JSONRPCResponse, method: string, params: JSONRPCParams }
) => {
    try {
        const { result } = validateResponse({
            maybeResponse: parseResponse(response),
            method,
            params
        });

        consola.trace('JSON-RPC Result:', result);
        return result;
    } catch (error) {
        throw error;
    }
};

export const rpc = async (method: string, params: any) => {
    const request: JSONRPCRequest = {
        jsonrpc: JSONRPC,
        method,
        params,
        id: 0
    };

    consola.trace('JSON-RPC Request:', request);
    try {
        const response = await window.jsonrpc(request) as string | JSONRPCResponse;
        return handleResponse({ response, method, params });
    } catch (error) {
        throw createWrappedError(
            `Error calling JSON-RPC api "${[method, JSON.stringify(params)].join('", "')}": ${error.message}`,
            error
        );
    }
};

