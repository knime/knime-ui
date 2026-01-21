import type { ToastServiceProvider } from "@knime/components";

import { defaultAPIErrorHandler } from "./defaultAPIErrorHandler";
import type { ToastPresetErrorHandler } from "./types";

export type ApplicationToastPresets = {
  openProjectFailed: ToastPresetErrorHandler;
  saveProjectFailed: ToastPresetErrorHandler;
  syncProjectFailed: ToastPresetErrorHandler;
  syncProjectSizeLimit: ToastPresetErrorHandler;
};

export const getPresets = (
  $toast: ToastServiceProvider,
): ApplicationToastPresets => {
  return {
    openProjectFailed: ({ error }) =>
      defaultAPIErrorHandler($toast, error, {
        type: "warning",
        headline: "Could not open workflow",
        message: "The workflow might not exist anymore or be corrupted.",
      }),

    saveProjectFailed: ({ error }) =>
      defaultAPIErrorHandler($toast, error, {
        type: "error",
        headline: "Could not save workflow",
      }),

    syncProjectFailed: ({ error }) =>
      defaultAPIErrorHandler($toast, error, {
        type: "error",
        headline: "Could not sync workflow",
      }),

    syncProjectSizeLimit: () =>
      $toast.show({
        headline: "Project size limit reached: disable auto sync",
        message:
          "You still can manually trigger a sync to the hub by clicking the cloud icon. It will always be synced on close of the session.",
        type: "info",
      }),
  };
};
