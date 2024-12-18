import { Client, RequestManager } from "@open-rpc/client-js";
import type { Store } from "vuex";

import { $bus } from "@/plugins/event-bus";
import type { RootStoreState } from "@/store/types";
import { getToastPresets } from "@/toastPresets";

import { DesktopAPTransport } from "./DesktopAPTransport";
import { WebSocketTransport } from "./WebSocketTransport";
import {
  getRegisteredEventHandler,
  registerEventHandler,
  serverEventHandler,
} from "./server-events";

let jsonRPCClient: Client;

export type ConnectionInfo = {
  url: string;
  restApiBaseUrl: string;
  sessionId: string;
  gtmId?: string;
};

const { toastPresets } = getToastPresets();

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

const setupServerEventListener = (ws: WebSocket) => {
  // setup server event handler
  ws.addEventListener("message", (message: { data: unknown }) => {
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
};

const handleConnectionChanges = (
  ws: WebSocket,
  store: Store<RootStoreState>,
) => {
  ws.addEventListener("close", (wsCloseEvent) => {
    consola.error("Websocket closed: ", wsCloseEvent);

    store.commit("application/setIsLoadingApp", false);
    store.commit("application/setIsLoadingWorkflow", false);

    // prevent user interactions
    $bus.emit("block-ui");

    const { toastPresets } = getToastPresets();
    toastPresets.connectivity.websocketClosed({ wsCloseEvent });
  });

  window.addEventListener("offline", () => {
    // prevent user interactions
    $bus.emit("block-ui");

    toastPresets.connectivity.connectionLoss();
  });

  window.addEventListener("online", () => {
    $bus.emit("unblock-ui");

    toastPresets.connectivity.connectionRestored();
  });
};

const setupActivityHeartbeat = (ws: WebSocket) => {
  // move sending hearbeats to the worker thread because timers will be
  // throttled when the page is in the background
  // see: https://developer.chrome.com/blog/timer-throttling-in-chrome-88/
  const activityWorker = new Worker(new URL("./activity", import.meta.url), {
    type: "module",
  });

  const startHeartbeat = () => {
    activityWorker.addEventListener("message", ({ data }) => {
      if (data?.type === "PING_COMPLETE") {
        consola.log("Sending Heartbeat to Websocket at: :>> ", new Date());
        ws.send("");
      }
    });
    activityWorker.postMessage({ type: "PING_START" });
  };

  ws.addEventListener("open", () => {
    startHeartbeat();
  });

  ws.addEventListener("error", (event) => {
    consola.error("Websocket error :>> ", event);
  });

  ws.addEventListener("close", (event) => {
    consola.log("Websocket closed :>>", event);
    activityWorker.postMessage({ type: "PING_STOP" });
  });
};

const initBrowserClient = (
  connectionInfo: ConnectionInfo,
  store: Store<RootStoreState>,
) =>
  new Promise((resolve, reject) => {
    try {
      if (!connectionInfo) {
        reject(new Error("Missing connection info"));
        return;
      }

      if (jsonRPCClient) {
        resolve("SUCCESS");
        return;
      }

      const transport = new WebSocketTransport(connectionInfo.url);

      const connection: WebSocket = transport.connection;

      setupActivityHeartbeat(connection);

      // setup server event handler and other events on the WS transport
      setupServerEventListener(connection);

      handleConnectionChanges(connection, store);

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

const getRPCClientInstance = () => jsonRPCClient;

const initJSONRPCClient = async (
  mode: "BROWSER" | "DESKTOP",
  connectionInfo: ConnectionInfo | null,
  store: Store<RootStoreState>,
) => {
  try {
    const clientInitializer =
      mode === "DESKTOP"
        ? initDesktopClient()
        : initBrowserClient(connectionInfo!, store);

    await clientInitializer;

    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
};

export {
  initJSONRPCClient,
  getRPCClientInstance,
  registerEventHandler,
  getRegisteredEventHandler,
};
