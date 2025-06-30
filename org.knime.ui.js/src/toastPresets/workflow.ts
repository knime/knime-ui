import type { ToastServiceProvider } from "@knime/components";

import { defaultErrorPresetHandler } from "./defaultErrorPresetHandler";
import { type ToastPresetErrorHandler } from "./types";

type WorkflowCommandsToastPresets = {
  nodeNameEditFail: ToastPresetErrorHandler;
  nodeLabelEditFail: ToastPresetErrorHandler;
};

type replacementOperation = {
  replaceNode: ToastPresetErrorHandler;
  insertOnConnection: ToastPresetErrorHandler;
};

type LayoutEditorToastPresets = {
  loadLayoutAndNodes: ToastPresetErrorHandler;
  setLayout: ToastPresetErrorHandler;
};

export type WorkflowToastPresets = {
  commands: WorkflowCommandsToastPresets;
  componentLoadedWithWarning: ToastPresetErrorHandler;
  componentLoadingFailed: ToastPresetErrorHandler;
  addNodeToCanvas: ToastPresetErrorHandler;
  replacementOperation: replacementOperation;
  layoutEditor: LayoutEditorToastPresets;
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

    addNodeToCanvas: ({ error }) =>
      defaultErrorPresetHandler($toast, error, {
        type: "error",
        headline: "Failed to add node to canvas",
      }),

    replacementOperation: {
      replaceNode: ({ error }) =>
        defaultErrorPresetHandler($toast, error, {
          type: "error",
          headline: "Failed to replace node in the canvas",
        }),

      insertOnConnection: ({ error }) =>
        defaultErrorPresetHandler($toast, error, {
          type: "error",
          headline: "Failed to insert node on connection",
        }),
    },

    layoutEditor: {
      loadLayoutAndNodes: ({ error }) =>
        defaultErrorPresetHandler($toast, error, {
          type: "error",
          headline: "Failed to load layout and nodes",
        }),
      setLayout: ({ error }) =>
        defaultErrorPresetHandler($toast, error, {
          type: "error",
          headline: "Failed to save layout",
        }),
    },
  };
};
