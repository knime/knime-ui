/* eslint-disable one-var */
import { Client } from "@open-rpc/client-js";

import type { EmbeddingContext } from "@knime/hub-features";

import { isDesktop } from "@/environment";

import { initBrowserRPCClient as _initBrowserRPCClient } from "./browser";
import { initDesktopRPCClient as _initDesktopRPCClient } from "./desktop";

let jsonRPCClient: Client;
let wsInstance: WebSocket;

const getRPCClientInstance = () => {
  if (!jsonRPCClient) {
    throw new Error("JSON RPC Client not available. Must be initialized first");
  }

  return jsonRPCClient;
};

const getWSInstance = () => {
  if (isDesktop()) {
    throw new Error(
      "Implementation error: WS instance not available on Desktop",
    );
  }

  if (!wsInstance) {
    throw new Error(
      "WS instance not available. RPC client must be initialized first",
    );
  }

  return wsInstance;
};

const initDesktopRPCClient = () => {
  if (jsonRPCClient) {
    throw new Error("RPCClient is already initialized");
  }

  jsonRPCClient = _initDesktopRPCClient();
};

const initBrowserRPCClient = (context: EmbeddingContext) => {
  if (jsonRPCClient) {
    throw new Error("RPCClient is already initialized");
  }

  const { client, ws } = _initBrowserRPCClient(context);
  jsonRPCClient = client;
  wsInstance = ws;

  return { ws };
};

export {
  initDesktopRPCClient,
  initBrowserRPCClient,
  getRPCClientInstance,
  getWSInstance,
};
