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
    consola.error("Could not access EquoComm service. Aborting");
    return Promise.reject(
      new Error("Could not access EquoComm service. Aborting")
    );
  }

  const JSON_RPC_ACTION_ID = "org.knime.ui.java.jsonrpc";
  const JAVA_EVENT_ACTION_ID = "org.knime.ui.java.event";

  // setup server event handler
  window.EquoCommService.on(
    JAVA_EVENT_ACTION_ID,
    (event) => serverEventHandler(event),
    // eslint-disable-next-line no-console
    (error) => console.error(error)
  );

  if (jsonRPCClient) {
    return Promise.resolve();
  }

  const transport = new DesktopAPTransport(JSON_RPC_ACTION_ID);
  const requestManager = new RequestManager([transport]);
  const client = new Client(requestManager);
  jsonRPCClient = client;

  return Promise.resolve("SUCCESS");
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
          serverEventHandler(data as string);
        }
      } catch (error) {
        consola.log(data);
      }
    });

    const requestManager = new RequestManager([transport]);
    const client = new Client(requestManager);
    jsonRPCClient = client;

    return Promise.resolve("SUCCESS");
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

    return Promise.resolve("SUCCESS");
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
