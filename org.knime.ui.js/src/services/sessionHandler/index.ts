import { $bus } from "@/plugins/event-bus";
import { useLifecycleStore } from "@/store/application/lifecycle";
import { getToastPresets } from "../toastPresets";

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
  ws.addEventListener("close", (wsCloseEvent) => {
    consola.error("Websocket closed: ", wsCloseEvent);

    useLifecycleStore().setIsLoadingApp(false);
    useLifecycleStore().setIsLoadingWorkflow(false);

    // prevent user interactions
    $bus.emit("block-ui");

    const { toastPresets } = getToastPresets();
    toastPresets.connectivity.websocketClosed({ wsCloseEvent });
  });
};

export const sessionHandler = {
  init: (ws: WebSocket) => {
    handleConnectionChanges(ws);
    handleNetworkLoss();
  },
};
