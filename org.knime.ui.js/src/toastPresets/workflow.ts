import type { ToastServiceProvider } from "@knime/components";

import { defaultAPIErrorHandler } from "./defaultAPIErrorHandler";
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
        defaultAPIErrorHandler($toast, error, {
          type: "error",
          headline: "Failed to save node name",
        }),

      nodeLabelEditFail: ({ error }) =>
        defaultAPIErrorHandler($toast, error, {
          type: "error",
          headline: "Failed to save node annotation",
        }),
    },

    addNodeToCanvas: ({ error }) =>
      defaultAPIErrorHandler($toast, error, {
        type: "error",
        headline: "Failed to add node to canvas",
      }),

    replacementOperation: {
      replaceNode: ({ error }) =>
        defaultAPIErrorHandler($toast, error, {
          type: "error",
          headline: "Failed to replace node in the canvas",
        }),

      insertOnConnection: ({ error }) =>
        defaultAPIErrorHandler($toast, error, {
          type: "error",
          headline: "Failed to insert node on connection",
        }),
    },

    layoutEditor: {
      loadLayoutAndNodes: ({ error }) =>
        defaultAPIErrorHandler($toast, error, {
          type: "error",
          headline: "Failed to load layout and nodes",
        }),
      setLayout: ({ error }) =>
        defaultAPIErrorHandler($toast, error, {
          type: "error",
          headline: "Failed to save layout",
        }),
    },
  };
};
