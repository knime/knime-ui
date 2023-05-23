import type { Configuration } from "./configuration";
import { rpc, registerNotificationHandler } from "../json-rpc-client";

export interface RPCClient {
  call(method: string, params: unknown): Promise<any>;

  registerEventHandlers(eventHandlers: Record<string, any>): void;
}

// eslint-disable-next-line unused-imports/no-unused-vars
export const createRPCClient = (configuration: Configuration): RPCClient => {
  const rpcClient: RPCClient = {
    call(method, params) {
      return rpc(method, params);
    },

    registerEventHandlers(handlers) {
      Object.entries(handlers).forEach(([eventName, eventHandler]) => {
        registerNotificationHandler(eventName, eventHandler);
      });
    },
  };

  return rpcClient;
};
