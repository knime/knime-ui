import { RequestManager, Client } from "@open-rpc/client-js";
import type { Store } from "vuex";

import type { RootStoreState } from "@/store/types";
import { getToastsProvider } from "@/plugins/toasts";

import {
  getRegisteredEventHandler,
  registerEventHandler,
  serverEventHandler,
} from "./server-events";

import { DesktopAPTransport } from "./DesktopAPTransport";
import { WebSocketTransport } from "./WebSocketTransport";

let jsonRPCClient: Client;

const $toast = getToastsProvider();

export type ConnectionInfo = {
  url: string;
  restApiBaseUrl: string;
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

const handleConnectionLoss = (ws: WebSocket, store: Store<RootStoreState>) => {
  const CONNECTION_LOST_TOAST_ID = "__CONNECTION_LOST";
  const onConnectionLost = (headline: string, message: string) => {
    // add transparent overlay to prevent user interactions
    store.dispatch("application/updateGlobalLoader", {
      loading: true,
      config: { displayMode: "transparent" },
    });

    $toast.show({
      id: CONNECTION_LOST_TOAST_ID,
      headline,
      message,
      type: "error",
      autoRemove: false,
    });
  };

  const onConnectionRestored = () => {
    store.dispatch("application/updateGlobalLoader", { loading: false });

    $toast.removeBy((toast) =>
      (toast.id ?? "").startsWith(CONNECTION_LOST_TOAST_ID),
    );

    $toast.show({
      type: "success",
      headline: "Connection restored",
    });
  };

  ws.addEventListener("close", (wsCloseEvent) => {
    consola.error("Websocket closed: ", wsCloseEvent);
    const isSessionExpired =
      wsCloseEvent.reason?.toLowerCase() === "proxy close";

    const headline = isSessionExpired ? "Session expired" : "Connection lost";
    const message = isSessionExpired
      ? "Refresh the page to reactivate the session."
      : "Connection lost. Try again later.";

    store.commit("application/setIsLoadingApp", false);
    store.commit("application/setIsLoadingWorkflow", false);
    onConnectionLost(headline, message);
  });

  window.addEventListener("offline", () => {
    onConnectionLost(
      "Connection lost",
      "Please, check your internet connection and try refreshing the page",
    );
  });

  window.addEventListener("online", () => {
    onConnectionRestored();
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

      handleConnectionLoss(connection, store);

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
