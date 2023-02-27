import type { Configuration } from './configuration';
import { rpc, registerNotificationHandler } from '../json-rpc-client';

export interface RPCClient {
    call(method: string, params: unknown): Promise<any>;

    registerEventHandler(eventHandlers: Record<string, any>): void;
}

export const createRPCClient = (configuration: Configuration): RPCClient => {
    const rpcClient: RPCClient = {
        call(method, params) {
            return rpc(method, params);
        },

        registerEventHandler(handlers) {
            Object.entries(handlers).forEach(([eventName, eventHandler]) => {
                registerNotificationHandler(eventName, eventHandler);
            });
        }
    };

    return rpcClient;
};
