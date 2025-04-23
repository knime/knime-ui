import type { ToastServiceProvider } from "@knime/components";

import { defaultAPIErrorHandler } from "./defaultAPIErrorHandler";
import type { ToastPresetErrorHandler } from "./types";

export type VersionsToastPresets = {
  activateModeFailed: ToastPresetErrorHandler;
  fetchAllFailed: ToastPresetErrorHandler;
  createFailed: ToastPresetErrorHandler;
  deleteFailed: ToastPresetErrorHandler;
  restoreFailed: ToastPresetErrorHandler;
  discardFailed: ToastPresetErrorHandler;
};

export const getPresets = (
  $toast: ToastServiceProvider,
): VersionsToastPresets => {
  return {
    activateModeFailed: ({ error }) =>
      defaultAPIErrorHandler($toast, error, {
        type: "error",
        autoRemove: false,
        headline: "Opening version history failed",
      }),
    fetchAllFailed: ({ error }) =>
      defaultAPIErrorHandler($toast, error, {
        type: "error",
        autoRemove: false,
        headline: "Loading all versions failed",
      }),
    createFailed: ({ error }) =>
      defaultAPIErrorHandler($toast, error, {
        type: "error",
        autoRemove: false,
        headline: "Creation of the version failed",
      }),
    deleteFailed: ({ error }) =>
      defaultAPIErrorHandler($toast, error, {
        type: "error",
        autoRemove: false,
        headline: "Deletion of the version failed",
      }),
    restoreFailed: ({ error }) =>
      defaultAPIErrorHandler($toast, error, {
        type: "error",
        autoRemove: false,
        headline: "Restoring project version failed",
      }),
    discardFailed: ({ error }) =>
      defaultAPIErrorHandler($toast, error, {
        type: "error",
        autoRemove: false,
        headline: "Discarding unversioned changes failed",
      }),
  };
};
