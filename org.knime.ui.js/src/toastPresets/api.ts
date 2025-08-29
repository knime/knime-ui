import type { ToastButton, ToastServiceProvider } from "@knime/components";
import CopyIcon from "@knime/styles/img/icons/copy.svg";

import { copyErrorReportToClipboard } from "@/util/copyErrorReportToClipboard";

import { defaultErrorPresetHandler } from "./defaultErrorPresetHandler";
import type { ToastPresetErrorHandler, ToastPresetHandler } from "./types";

export type ApiToastPresets = {
  hubActionError: ToastPresetErrorHandler<{
    headline: string;
    message?: string;
  }>;
  hubLimitInfo: ToastPresetHandler<{
    headline: string;
    message: string;
    button: ToastButton;
  }>;
};

export const getPresets = ($toast: ToastServiceProvider): ApiToastPresets => {
  return {
    hubActionError: ({ error, headline, message }) =>
      defaultErrorPresetHandler($toast, error, {
        type: "error",
        autoRemove: false,
        headline,
        message: message ?? "Unexpected error during hub action.",
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
    hubLimitInfo: ({ headline, message, button }) => {
      $toast.show({
        type: "info",
        autoRemove: false,
        headline,
        message,
        buttons: [button],
      });
    },
  };
};
