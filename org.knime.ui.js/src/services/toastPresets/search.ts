import type { ToastServiceProvider } from "@knime/components";

import { defaultAPIErrorHandler } from "./defaultAPIErrorHandler";
import { type ToastPresetErrorHandler } from "./types";

export type SearchToastPresets = {
  nodeSearch: ToastPresetErrorHandler;
  componentSearch: ToastPresetErrorHandler;
};

export const getPresets = (
  $toast: ToastServiceProvider,
): SearchToastPresets => {
  return {
    nodeSearch: ({ error }) =>
      defaultAPIErrorHandler($toast, error, {
        type: "error",
        headline: "Failed to search for nodes",
      }),
    componentSearch: ({ error }) =>
      defaultAPIErrorHandler($toast, error, {
        type: "error",
        headline: "Failed to search for components",
      }),
  };
};
