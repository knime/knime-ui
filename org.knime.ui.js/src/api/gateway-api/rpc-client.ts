import { getRPCClientInstance, registerEventHandler } from "../json-rpc-client";

export interface RPCClient {
  call(
    method: string,
    params: object | readonly unknown[] | undefined,
  ): Promise<any>;

  registerEventHandlers(eventHandlers: Record<string, any>): void;
}

const isObject = (e: unknown): e is Exclude<object, any[]> => {
  return e !== null && typeof e === "object" && !Array.isArray(e);
};

type JSONRPCErrorData = {
  data: unknown;
};

const isJSONRPCErrorWithData = (e: unknown): e is JSONRPCErrorData => {
  return (
    isObject(e) && "code" in e && typeof e.code === "number" && "data" in e
  );
};

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
        });

        return response;
      } catch (error) {
        consola.error("RPC Client:: Error RPC request", error);

        if (isJSONRPCErrorWithData(error)) {
          throw error.data;
        }

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
