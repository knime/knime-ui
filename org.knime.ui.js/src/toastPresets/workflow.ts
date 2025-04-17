import type { ToastServiceProvider } from "@knime/components";

import { defaultErrorPresetHandler } from "./defaultErrorPresetHandler";
import { type ToastPresetErrorHandler } from "./types";

type WorkflowCommandsToastPresets = {
  nodeNameEditFail: ToastPresetErrorHandler;
  nodeLabelEditFail: ToastPresetErrorHandler;
};

export type WorkflowToastPresets = {
  commands: WorkflowCommandsToastPresets;
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
  };
};
