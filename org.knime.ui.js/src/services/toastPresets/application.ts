import type { ToastServiceProvider } from "@knime/components";

import { defaultAPIErrorHandler } from "./defaultAPIErrorHandler";
import type { ToastPresetErrorHandler, ToastPresetHandler } from "./types";

export type ApplicationToastPresets = {
  openProjectFailed: ToastPresetErrorHandler;
  saveProjectFailed: ToastPresetErrorHandler;
  noWebGlFallbackCanvas: ToastPresetHandler;
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

    noWebGlFallbackCanvas: () => {
      $toast.show({
        headline: "WebGL isn't supported or disabled",
        message:
          "For the best experience, this app relies on WebGL. As it's currently unavailable, performance " +
          "and visuals may be impacted. Feel free to continue anyway, or if your browser supports it, enable WebGL in your settings for the full experience.",
        type: "warning",
        autoRemove: false,
      });
    },
  };
};
