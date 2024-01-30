import { JSONRPCError } from "@open-rpc/client-js";
import { ERR_TIMEOUT } from "@open-rpc/client-js/build/Error";

import { getToastsProvider } from "@/plugins/toasts";
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
export const createRPCClient = (configuration: Configuration): RPCClient => {
  const $toasts = getToastsProvider();

  const rpcClient: RPCClient = {
    async call(method, params) {
      try {
        return await getRPCClientInstance().request({
          ...request,
          method,
          params,
        });
      } catch (error) {
        if (error instanceof JSONRPCError && error.code !== ERR_TIMEOUT) {
          const isDev = import.meta.env.DEV;

          const stack = error.stack;
          $toasts.show({
            type: "error",
            message: "Something went wrong.",
            buttons: isDev
              ? [
                  {
                    text: "Copy stacktrace",
                    callback: () => {
                      navigator.clipboard.writeText(stack ?? "");
                    },
                  },
                ]
              : [],
          });
        }

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
