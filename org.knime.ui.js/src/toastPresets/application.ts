/* eslint-disable handle-callback-err */
import type { ToastServiceProvider } from "@knime/components";

import { defaultErrorPresetHandler } from "./defaultErrorPresetHandler";
import type { ToastPresetErrorHandler } from "./types";

export type ApplicationToastPresets = {
  openProjectFailed: ToastPresetErrorHandler;
};

export const getPresets = (
  $toast: ToastServiceProvider,
): ApplicationToastPresets => {
  return {
    openProjectFailed: ({ error }) =>
      defaultErrorPresetHandler($toast, error, {
        type: "warning",
        headline: "Could not open workflow",
        message: "The workflow might not exist anymore or be corrupted",
      }),
  };
};
