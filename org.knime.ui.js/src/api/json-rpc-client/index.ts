import { RequestManager, Client } from "@open-rpc/client-js";

import {
  getRegisteredEventHandler,
  registerEventHandler,
  serverEventHandler,
} from "./server-events";

import type { JSONRPCClient } from "./types";
import { DesktopAPTransport } from "./DesktopAPTransport";
import { WebSocketTransport } from "./WebSocketTransport";

let jsonRPCClient: JSONRPCClient = null;

export type ConnectionInfo = {
  url: string;
  restApiBaseUrl: string;
  jobId: string;
  sessionId: string;
};

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
    (error) => consola.error(error),
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

const initBrowserClient = (connectionInfo: ConnectionInfo) =>
  new Promise((resolve, reject) => {
    try {
      if (jsonRPCClient) {
        resolve("SUCCESS");
        return;
      }

      const transport = new WebSocketTransport(connectionInfo.url);
      const { connection } = transport;

      // setup server event handler
      connection.addEventListener("message", (message) => {
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

      // initialize the client and request manager to start the WS connection
      const requestManager = new RequestManager([transport]);
      const client = new Client(requestManager);

      jsonRPCClient = client;
      resolve("SUCCESS");
    } catch (error) {
      consola.error(error);
      // if any other unknown error happens then reject client initialization
      reject(error);
    }
  });

const initJSONRPCClient = async (
  mode: "BROWSER" | "DESKTOP",
  connectionInfo: ConnectionInfo,
) => {
  try {
    const clientInitializer =
      mode === "DESKTOP" ? initDesktopClient : initBrowserClient;

    await clientInitializer(connectionInfo);

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
