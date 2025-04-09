import { getRPCClientInstance, registerEventHandler } from "../json-rpc-client";

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

export const createRPCClient = (): RPCClient => {
  const rpcClient: RPCClient = {
    async call(method, params) {
      try {
        const response = await getRPCClientInstance().request({
          ...request,
          method,
          params,
        });

        consola.trace("RPC Client:: request", {
          request,
          method,
          params,
          response,
        });

        return response;
      } catch (error) {
        consola.error("RPC Client:: Error RPC request", error);

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
