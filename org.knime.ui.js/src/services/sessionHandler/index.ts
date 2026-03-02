import { embeddingSDK } from "@knime/hub-features";

import { $bus } from "@/plugins/event-bus";
import { useHostContextStore } from "@/store/application/hostContext";
import { getToastPresets } from "../toastPresets";

let didOpenWSConnection = false;

const handleNetworkLoss = () => {
  const { toastPresets } = getToastPresets();
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

const handleConnectionChanges = (ws: WebSocket) => {
  ws.addEventListener("open", () => {
    didOpenWSConnection = true;
  });

  ws.addEventListener("close", (wsCloseEvent) => {
    consola.error("Websocket closed: ", wsCloseEvent);

    // if the WS closes after it had connected at least once, we retry to resume the session
    // otherwise render a failure message
    if (didOpenWSConnection) {
      useHostContextStore().scheduleSessionResume();
    } else {
      embeddingSDK.guest.sendEmbeddingFailureMessage(
        new Error("Websocket connection could not be established"),
      );
    }
  });
};

export const sessionHandler = {
  init: (ws: WebSocket) => {
    handleConnectionChanges(ws);
    handleNetworkLoss();
  },
};
