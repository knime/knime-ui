import { getRPCClientInstance, registerEventHandler } from "../json-rpc-client";
import type { Configuration } from "./configuration";

export interface RPCClient {
  call(
    method: string,
    params: object | readonly unknown[] | undefined,
  ): Promise<any>;

  registerEventHandlers(eventHandlers: Record<string, any>): void;
}

const request = {
  jsonrpc: "2.0",
  id: 0,
} as const;

// eslint-disable-next-line unused-imports/no-unused-vars
const createRPCClient = (configuration: Configuration): RPCClient => {
  const rpcClient: RPCClient = {
    async call(method, params) {
      try {
        return await getRPCClientInstance().request({
          ...request,
          method,
          params,
        });
      } catch (error) {
        consola.error("Error making RPC call", error);

        throw error;
      }
    },

    registerEventHandlers(handlers) {
      Object.entries(handlers).forEach(([eventName, eventHandler]) => {
        registerEventHandler(eventName, eventHandler);
      });
    },
  };

  return rpcClient;
};

export { createRPCClient };
