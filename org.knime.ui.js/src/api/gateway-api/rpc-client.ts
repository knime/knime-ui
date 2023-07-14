import type { Configuration } from "./configuration";
import { jsonRPCClient, registerEventHandler } from "../json-rpc-client";

export interface RPCClient {
  call(method: string, params: unknown): Promise<any>;

  registerEventHandlers(eventHandlers: Record<string, any>): void;
}

const request = {
  jsonrpc: "2.0",
  id: 0,
} as const;

// eslint-disable-next-line unused-imports/no-unused-vars
export const createRPCClient = (configuration: Configuration): RPCClient => {
  const rpcClient: RPCClient = {
    call(method, params) {
      return jsonRPCClient.request({ ...request, method, params });
    },

    registerEventHandlers(handlers) {
      Object.entries(handlers).forEach(([eventName, eventHandler]) => {
        registerEventHandler(eventName, eventHandler);
      });
    },
  };

  return rpcClient;
};
