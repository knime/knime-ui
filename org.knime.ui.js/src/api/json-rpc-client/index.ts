import {
  RequestManager,
  Client,
  WebSocketTransport,
} from "@open-rpc/client-js";

import {
  getRegisteredEventHandler,
  registerEventHandler,
  serverEventHandler,
} from "./server-events";

import type { JSONRPCClient } from "./types";
import { DesktopAPTransport } from "./DesktopAPTransport";

let jsonRPCClient: JSONRPCClient = null;

const initDesktopClient = () => {
  if (!window.EquoCommService) {
    const ERROR_MSG = "Could not access EquoComm service. Aborting";
    consola.error(ERROR_MSG);
    return Promise.reject(new Error(ERROR_MSG));
  }

  const JSON_RPC_ACTION_ID = "org.knime.ui.java.jsonrpc";
  const JAVA_EVENT_ACTION_ID = "org.knime.ui.java.event";

  // setup server event handler
  window.EquoCommService.on(
    JAVA_EVENT_ACTION_ID,
    (event) => serverEventHandler(event),
    (error) => consola.error(error)
  );

  if (jsonRPCClient) {
    return Promise.resolve();
  }

  const transport = new DesktopAPTransport(JSON_RPC_ACTION_ID);
  const requestManager = new RequestManager([transport]);
  const client = new Client(requestManager);
  jsonRPCClient = client;

  return Promise.resolve();
};

const initBrowserClient = (url: string) => {
  try {
    if (jsonRPCClient) {
      return Promise.resolve();
    }

    const transport = new WebSocketTransport(url);

    // setup server event handler
    transport.connection.addEventListener("message", (message) => {
      const { data } = message;
      if (typeof data !== "string") {
        return;
      }

      try {
        const parsed = JSON.parse(data);
        if (parsed.eventType) {
          serverEventHandler(data);
        }
      } catch (error) {
        consola.log(data);
      }
    });

    const requestManager = new RequestManager([transport]);
    const client = new Client(requestManager);
    jsonRPCClient = client;

    return Promise.resolve();
  } catch (error) {
    consola.log(error);
    return Promise.reject(error);
  }
};

const initJSONRPCClient = async (mode: "BROWSER" | "DESKTOP", url: string) => {
  try {
    const clientInitializer =
      mode === "DESKTOP" ? initDesktopClient : initBrowserClient;

    await clientInitializer(url);

    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};

export {
  initJSONRPCClient,
  jsonRPCClient,
  registerEventHandler,
  getRegisteredEventHandler,
};
