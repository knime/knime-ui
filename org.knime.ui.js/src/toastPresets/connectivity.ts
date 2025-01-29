import type { ToastServiceProvider } from "@knime/components";

import { defaultErrorPresetHandler } from "./defaultErrorPresetHandler";
import { type ToastPresetErrorHandler, type ToastPresetHandler } from "./types";
import { removeAllToastsByPrefix } from "./utils";

export type ConnectivityPresets = {
  networkProblem: ToastPresetErrorHandler;
  hubSessionExpired: ToastPresetHandler;
  // browser
  connectionLoss: ToastPresetHandler;
  connectionRestored: ToastPresetHandler;
  websocketClosed: ToastPresetHandler<{ wsCloseEvent: CloseEvent }>;
};

const CONNECTION_LOST_TOAST_ID_PREFIX = "__CONNECTION_LOST";

export const getPresets = (
  $toast: ToastServiceProvider,
): ConnectivityPresets => {
  return {
    networkProblem: ({ error } = {}) =>
      defaultErrorPresetHandler($toast, error, {
        headline: "Connectivity problem",
        message: "Check you network connection.",
        type: "error",
        autoRemove: false,
      }),
    connectionLoss: () =>
      $toast.show({
        id: `${CONNECTION_LOST_TOAST_ID_PREFIX}CONNECTION_LOST`,
        headline: "Connection lost",
        message: "Check your internet connection and refresh the page.",
        type: "error",
        autoRemove: false,
      }),
    websocketClosed: ({ wsCloseEvent }) => {
      const isSessionExpired =
        wsCloseEvent.reason?.toLowerCase() === "proxy close";

      const headline = isSessionExpired ? "Session expired" : "Connection lost";

      const message = isSessionExpired
        ? "Refresh the page to reactivate the session."
        : "Connection lost. Try again later.";

      $toast.show({
        id: `${CONNECTION_LOST_TOAST_ID_PREFIX}_WS_CLOSED`,
        headline,
        message,
        type: "error",
        autoRemove: false,
      });
    },
    connectionRestored: () => {
      removeAllToastsByPrefix($toast, CONNECTION_LOST_TOAST_ID_PREFIX);

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
