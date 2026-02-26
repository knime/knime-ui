import { Client, RequestManager } from "@open-rpc/client-js";

import { serverEventHandler } from "../../events/server-events";

import { DesktopAPTransport } from "./DesktopAPTransport";

export const initDesktopRPCClient = () => {
  if (!window.EquoCommService) {
    const ERROR_MSG = "Could not access EquoComm service. Aborting";
    consola.error(ERROR_MSG);
    throw new Error(ERROR_MSG);
  }

  const JSON_RPC_ACTION_ID = "org.knime.ui.java.jsonrpc";
  const JAVA_EVENT_ACTION_ID = "org.knime.ui.java.event";

  // setup server event handler
  window.EquoCommService.on(
    JAVA_EVENT_ACTION_ID,
    (event) => serverEventHandler(event),
    (error) => consola.error(error),
  );

  const transport = new DesktopAPTransport(JSON_RPC_ACTION_ID);
  const requestManager = new RequestManager([transport]);
  return new Client(requestManager);
};
