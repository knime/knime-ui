import {
  RequestManager,
  Client,
  WebSocketTransport,
} from "@open-rpc/client-js";

import {
  getRegisteredNotificationHandler,
  registerNotificationHandler,
} from "./server-events";
import type { JSONRPCClient } from "./types";
import { DesktopAPTransport } from "./DesktopAPTransport";

type ClientInitResult = Promise<any>;

let jsonRPCClient: JSONRPCClient = null;

const initDesktopClient = (): ClientInitResult => {
  if (!window.EquoCommService) {
    consola.error("Could not access EquoComm service. Aborting");
    return Promise.reject(
      new Error("Could not access EquoComm service. Aborting")
    );
  }

  if (jsonRPCClient) {
    return Promise.resolve();
  }

  const transport = new DesktopAPTransport("");
  const requestManager = new RequestManager([transport]);
  const client = new Client(requestManager);
  jsonRPCClient = client;

  return Promise.resolve("SUCCESS");
};

const initBrowserClient = (): ClientInitResult => {
  try {
    if (jsonRPCClient) {
      return Promise.resolve();
    }

    const WS_SOCKET_URL = "ws://localhost:7000/websocket";

    const transport = new WebSocketTransport(WS_SOCKET_URL);
    const requestManager = new RequestManager([transport]);
    const client = new Client(requestManager);
    jsonRPCClient = client;

    return Promise.resolve("SUCCESS");
  } catch (error) {
    consola.log(error);
    return Promise.reject(error);
  }
};

const initJSONRPCClient = async (mode: "BROWSER" | "DESKTOP") => {
  try {
    const clientInitializer =
      mode === "DESKTOP" ? initDesktopClient : initBrowserClient;

    await clientInitializer();

    return Promise.resolve("SUCCESS");
  } catch (error) {
    return Promise.reject(error);
  }
};

export {
  initJSONRPCClient,
  jsonRPCClient,
  registerNotificationHandler,
  getRegisteredNotificationHandler,
};
