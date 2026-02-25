import { Client, RequestManager } from "@open-rpc/client-js";

import type { EmbeddingContext } from "@knime/hub-features";

import { serverEventHandler } from "@/api/events/server-events";

import { WebSocketTransport } from "./WebSocketTransport";

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
    } catch (_error) {
      consola.log(data);
    }
  });
};

/**
 * Keep WS alive by sending hearbeats over the connection periodically. Otherwise
 * infrastucture closes the WS connection when idle
 */
const setupActivityHeartbeat = (ws: WebSocket) => {
  // move sending heartbeats to the worker thread because timers will be
  // throttled when the page is in the background
  // see: https://developer.chrome.com/blog/timer-throttling-in-chrome-88/
  const activityWorker = new Worker(new URL("./activity", import.meta.url), {
    type: "module",
  });

  const startHeartbeat = () => {
    activityWorker.addEventListener("message", ({ data }) => {
      if (data?.type === "PING_COMPLETE") {
        consola.debug(
          "Sending Heartbeat to Websocket at: :>> ",
          new Date().toISOString(),
        );
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
    consola.info("Websocket closed :>>", event);
    activityWorker.postMessage({ type: "PING_STOP" });
  });
};

export const initBrowserRPCClient = (context: EmbeddingContext) => {
  try {
    if (!context) {
      throw new Error("Missing browser session context");
    }

    if (!context.wsConnectionUri && !context.url) {
      throw new Error("Missing websocket uri");
    }

    const transport = new WebSocketTransport(
      context.wsConnectionUri ?? context.url,
    );

    const connection: WebSocket = transport.connection;

    setupActivityHeartbeat(connection);

    // setup server event handler and other events on the WS transport
    setupServerEventListener(connection);

    // initialize the client and request manager to start the WS connection
    const requestManager = new RequestManager([transport]);
    const client = new Client(requestManager);

    return { client, ws: connection };
  } catch (error) {
    consola.error(error);
    // if any other unknown error happens then reject client initialization
    throw error;
  }
};
