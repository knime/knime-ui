import type { ToastServiceProvider } from "@knime/components";

import { type ToastPresetHandler } from "./types";
import { removeAllToastsByIds } from "./utils";

const toastIds = new Set<string>();

export type ConnectivityPresets = {
  hubSessionExpired: ToastPresetHandler;
  // browser
  connectionLoss: ToastPresetHandler;
  connectionRestored: ToastPresetHandler;
  websocketClosed: ToastPresetHandler<{ wsCloseEvent: CloseEvent }>;
};

export const getPresets = (
  $toast: ToastServiceProvider,
): ConnectivityPresets => {
  return {
    connectionLoss: () => {
      const toastId = $toast.show({
        headline: "Connection lost",
        message: "Check your internet connection and refresh the page.",
        type: "error",
        autoRemove: false,
      });
      toastIds.add(toastId);
    },
    websocketClosed: ({ wsCloseEvent }) => {
      const isSessionExpired =
        wsCloseEvent.reason?.toLowerCase() === "proxy close";

      const headline = isSessionExpired ? "Session expired" : "Connection lost";

      const message = isSessionExpired
        ? "Refresh the page to reactivate the session."
        : "Connection lost. Try again later.";

      const toastId = $toast.show({
        headline,
        message,
        type: "error",
        autoRemove: false,
      });
      toastIds.add(toastId);
    },
    connectionRestored: () => {
      removeAllToastsByIds($toast, toastIds);
      toastIds.clear();

      $toast.show({
        type: "success",
        headline: "Connection restored",
      });
    },
    hubSessionExpired: () => {
      $toast.show({
        type: "error",
        headline: "KNIME Hub session expired",
        message: "Please log in again to continue.",
      });
    },
  };
};
