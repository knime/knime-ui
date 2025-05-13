import type { ToastServiceProvider } from "@knime/components";
import CopyIcon from "@knime/styles/img/icons/copy.svg";

import { copyErrorReportToClipboard } from "@/util/copyErrorReportToClipboard";

import { defaultErrorPresetHandler } from "./defaultErrorPresetHandler";
import type { ToastPresetErrorHandler } from "./types";

export type ApiToastPresets = {
  hubActionError: ToastPresetErrorHandler<{
    headline: string;
    message?: string;
  }>;
};

export const getPresets = ($toast: ToastServiceProvider): ApiToastPresets => {
  return {
    hubActionError: ({ error, headline, message }) =>
      defaultErrorPresetHandler($toast, error, {
        type: "error",
        autoRemove: false,
        headline,
        message: message ?? "Unexpected error during hub communication",
        buttons: [
          {
            callback: () => {
              copyErrorReportToClipboard({
                errorContext: headline,
                error,
              });
            },
            text: "Copy details to clipboard",
            icon: CopyIcon,
          },
        ],
      }),
  };
};
