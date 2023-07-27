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

export type ConnectionInfo = {
  url: string;
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

const doConnectionHandshake = (
  connection: typeof WebSocketTransport.prototype.connection,
  connectionInfo: ConnectionInfo
) =>
  new Promise((resolve, reject) => {
    // immediately resolve for local development, because the jobId is just a
    // local workflow instead of a remote job running in the executor
    if (!connectionInfo.jobId) {
      resolve("SUCCESS");
    }

    // setup handler to receive the handshake. This will only fire upon receiving the
    // first message on the WS channel, and then the handler will automatically unregister
    const handshakeResolve = (message) => {
      const { data } = message;
      if (typeof data !== "string") {
        return;
      }

      try {
        const parsed = JSON.parse(data);

        if (connectionInfo.jobId !== null && parsed.status === "success") {
          connection.removeEventListener("message", handshakeResolve);
          resolve("SUCCESS");
        }
      } catch (error) {
        connection.removeEventListener("message", handshakeResolve);
        reject(new Error("Handshake error"));
      }
    };

    connection.addEventListener("message", handshakeResolve);

    // setup the start of the handshake
    // as soon as the connection opens a message will be sent over the WS
    // channel to send the projectId and initiate the handshake
    const handshakeStart = () => {
      connection.send(
        JSON.stringify({
          workflowProjectId: connectionInfo.jobId,
        })
      );

      // immediately remove the handler since it's not needed after this
      connection.removeEventListener("open", handshakeStart);
    };

    connection.addEventListener("open", handshakeStart);
  });

const initBrowserClient = (connectionInfo: ConnectionInfo) =>
  new Promise((resolve, reject) => {
    try {
      if (jsonRPCClient) {
        resolve("SUCCESS");
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

      // only resolve client after handshake is complete
      doConnectionHandshake(connection, connectionInfo)
        .then(() => {
          jsonRPCClient = client;

          // resolve outer promise
          resolve("SUCCESS");
        })
        .catch((error) => reject(error));
    } catch (error) {
      consola.log(error);
      // if any other unknown error happens then reject client initialization
      reject(error);
    }
  });

// const handshakeResolve = (message) => {
//   const { data } = message;
//   if (typeof data !== "string") {
//     return;
//   }

//   try {
//     const parsed = JSON.parse(data);

//     if (connectionInfo.jobId !== null && parsed.status === "success") {
//       resolve("SUCCESS");
//     }
//   } catch (error) {
//     reject(new Error("Handshake error"));
//   } finally {
//     connection.removeEventListener("message", handshakeResolve);
//   }
// };

// connection.addEventListener("message", handshakeResolve);

// if (connectionInfo.jobId !== null) {
//   const handshakeStart = () => {
//     connection.send(
//       JSON.stringify({
//         workflowProjectId: connectionInfo.jobId,
//       })
//     );

//     connection.removeEventListener("open", handshakeStart);
//   };

//   connection.addEventListener("open", handshakeStart);
// }

// -----------------------------------------------

// const initBrowserClient = (connectionInfo: ConnectionInfo) => {
//   try {
//     if (jsonRPCClient) {
//       return Promise.resolve();
//     }

//     const transport = new WebSocketTransport(url);

//     // setup server event handler
//     transport.connection.addEventListener("message", (message) => {
//       const { data } = message;
//       if (typeof data !== "string") {
//         return;
//       }

//       try {
//         const parsed = JSON.parse(data);
//         if (parsed.eventType) {
//           serverEventHandler(data);
//         }
//       } catch (error) {
//         consola.log(data);
//       }
//     });

//     const requestManager = new RequestManager([transport]);
//     const client = new Client(requestManager);
//     jsonRPCClient = client;

//     return Promise.resolve();
//   } catch (error) {
//     consola.log(error);
//     return Promise.reject(error);
//   }
// };

const initJSONRPCClient = async (
  mode: "BROWSER" | "DESKTOP",
  connectionInfo: ConnectionInfo
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
