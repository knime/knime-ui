import type { ToastServiceProvider } from "@knime/components";

import { KaiQuickActionError } from "@/api/gateway-api/generated-api";

import type { ToastPresetHandler } from "./types";

/**
 * Util for external callers (e.g. the aiQuickAction store) to parse errors from the AI service.
 */
export const parseQuickActionError = (error: unknown): KaiQuickActionError => {
  try {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const parsed = JSON.parse(errorMessage);

    // AI service's FastAPI framework adds the `detail` property.
    // In case we migrate to Go in the future (no `detail` property), we fallback to the root object here
    const errorData = parsed.detail || parsed;

    if (errorData.code && errorData.message) {
      return errorData as KaiQuickActionError;
    }
  } catch {
    // Not JSON or parsing failed
  }

  // Fallback for any unparseable or malformed errors
  return {
    code: KaiQuickActionError.CodeEnum.UNKNOWN,
    message: "An unexpected error occurred.",
  };
};

export type AiQuickActionToastPresets = {
  quotaExceeded: ToastPresetHandler<{ message: string }>;
  timeout: ToastPresetHandler<{ message: string }>;
  llmError: ToastPresetHandler<{ message: string }>;
  validationError: ToastPresetHandler<{ message: string }>;
  serviceUnavailable: ToastPresetHandler<{ message: string }>;
  authenticationFailed: ToastPresetHandler<{
    message: string;
    hubId: string;
    onLogin: () => Promise<void>;
  }>;
  unknownError: ToastPresetHandler<{ message: string }>;
  actionNotSupported: ToastPresetHandler<{ hubId: string }>;
  noActiveWorkflow: ToastPresetHandler;
};

export const getPresets = (
  $toast: ToastServiceProvider,
): AiQuickActionToastPresets => {
  return {
    quotaExceeded: ({ message }) =>
      $toast.show({
        type: "warning",
        headline: "AI interaction limit reached",
        message,
        autoRemove: false,
      }),

    timeout: ({ message }) =>
      $toast.show({
        type: "error",
        headline: "AI quick action request timed out",
        message,
        autoRemove: false,
      }),

    llmError: ({ message }) =>
      $toast.show({
        type: "error",
        headline: "Could not perform AI quick action",
        message,
        autoRemove: false,
      }),

    validationError: ({ message }) =>
      $toast.show({
        type: "warning",
        headline: "Could not perform AI quick action",
        message,
        autoRemove: false,
      }),

    serviceUnavailable: ({ message }) =>
      $toast.show({
        type: "error",
        headline: "AI services unavailable",
        message,
        autoRemove: false,
      }),

    authenticationFailed: ({ message, hubId, onLogin }) =>
      $toast.show({
        type: "warning",
        headline: "Could not authenticate with KNIME Hub",
        message,
        autoRemove: false,
        buttons: [
          {
            text: `Log in to ${hubId}`,
            callback: onLogin,
          },
        ],
      }),

    unknownError: ({ message }) =>
      $toast.show({
        type: "error",
        headline: "AI quick action failed",
        message,
        autoRemove: false,
      }),

    actionNotSupported: ({ hubId }) =>
      $toast.show({
        type: "warning",
        headline: "Could not perform AI quick action",
        message: `${hubId} does not support this AI quick action.`,
      }),

    noActiveWorkflow: () =>
      $toast.show({
        type: "error",
        headline: "Could not perform AI quick action",
        message: "No active workflow found.",
      }),
  };
};
