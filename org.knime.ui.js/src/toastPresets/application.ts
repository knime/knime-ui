import type { ToastServiceProvider } from "@knime/components";

import { defaultAPIErrorHandler } from "./defaultAPIErrorHandler";
import type { ToastPresetErrorHandler } from "./types";

export type ApplicationToastPresets = {
  openProjectFailed: ToastPresetErrorHandler;
  saveProjectFailed: ToastPresetErrorHandler;
};

export const getPresets = (
  $toast: ToastServiceProvider,
): ApplicationToastPresets => {
  return {
    openProjectFailed: ({ error }) =>
      defaultAPIErrorHandler($toast, error, {
        type: "warning",
        headline: "Could not open workflow",
        message: "The workflow might not exist anymore or be corrupted",
      }),

    saveProjectFailed: ({ error }) =>
      defaultAPIErrorHandler($toast, error, {
        type: "error",
        headline: "Could not save workflow",
      }),
  };
};
