import type { ToastServiceProvider } from "@knime/components";

import { defaultErrorPresetHandler } from "./defaultErrorPresetHandler";
import { type ToastPresetErrorHandler } from "./types";

type WorkflowCommandsToastPresets = {
  nodeNameEditFail: ToastPresetErrorHandler;
  nodeLabelEditFail: ToastPresetErrorHandler;
};

type AddToCanvasToastPresets = {
  addNode: ToastPresetErrorHandler;
  replaceNode: ToastPresetErrorHandler;
};

export type WorkflowToastPresets = {
  commands: WorkflowCommandsToastPresets;
  componentLoadedWithWarning: ToastPresetErrorHandler;
  componentLoadingFailed: ToastPresetErrorHandler;
  addToCanvas: AddToCanvasToastPresets;
};

export const getPresets = (
  $toast: ToastServiceProvider,
): WorkflowToastPresets => {
  return {
    commands: {
      nodeNameEditFail: ({ error }) =>
        defaultErrorPresetHandler($toast, error, {
          type: "error",
          headline: "Failed to save node name",
        }),

      nodeLabelEditFail: ({ error }) =>
        defaultErrorPresetHandler($toast, error, {
          type: "error",
          headline: "Failed to save node annotation",
        }),
    },
    componentLoadedWithWarning: ({ message, details }) => {
      $toast.show({
        headline: message,
        message: details,
        type: "warning",
        autoRemove: true,
      });
    },
    componentLoadingFailed: ({ message, details }) => {
      $toast.show({
        headline: message,
        message: details,
        type: "error",
        autoRemove: false,
      });
    },
    addToCanvas: {
      addNode: ({ error }) =>
        defaultErrorPresetHandler($toast, error, {
          type: "error",
          headline: "Failed to add node to canvas",
        }),

      replaceNode: ({ error }) =>
        defaultErrorPresetHandler($toast, error, {
          type: "error",
          headline: "Failed to replace node in the canvas",
        }),
    },
  };
};
