import type { ToastServiceProvider } from "@knime/components";

import { KaiQuickActionError } from "@/api/gateway-api/generated-api";

export type AiQuickActionsToastPresets = {
  actionNotSupported: (params: { hubId: string }) => void;
  noActiveWorkflow: () => void;
  validationError: (params: { message: string }) => void;
  llmError: (params: { message: string }) => void;
  authenticationFailed: (params: {
    message: string;
    hubId: string;
    onLogin: () => Promise<void>;
  }) => void;
  quotaExceeded: (params: { message: string }) => void;
  serviceUnavailable: (params: { message: string }) => void;
  timeout: (params: { message: string }) => void;
  unknownError: (params: { message: string }) => void;
};

export const getPresets = (
  $toast: ToastServiceProvider,
): AiQuickActionsToastPresets => {
  return {
    actionNotSupported: ({ hubId }) =>
      $toast.show({
        type: "warning",
        headline: "Could not perform AI quick action",
        message: `${hubId} does not support AI quick actions.`,
      }),

    noActiveWorkflow: () =>
      $toast.show({
        type: "error",
        headline: "Could not perform AI quick action",
        message: "No active workflow found.",
      }),

    validationError: ({ message }) =>
      $toast.show({
        type: "warning",
        headline: "Could not perform AI quick action",
        message,
      }),

    llmError: ({ message }) =>
      $toast.show({
        type: "error",
        headline: "Could not perform AI quick action",
        message,
      }),

    authenticationFailed: ({ message, hubId, onLogin }) =>
      $toast.show({
        type: "warning",
        headline: "Could not authenticate with KNIME Hub",
        message,
        buttons: [
          {
            text: `Log in to ${hubId}`,
            callback: onLogin,
          },
        ],
      }),

    quotaExceeded: ({ message }) =>
      $toast.show({
        type: "warning",
        headline: "AI Interaction limit reached",
        message,
      }),

    serviceUnavailable: ({ message }) =>
      $toast.show({
        type: "error",
        headline: "AI services unavailable",
        message,
      }),

    timeout: ({ message }) =>
      $toast.show({
        type: "error",
        headline: "AI quick action request timed out",
        message,
      }),

    unknownError: ({ message }) =>
      $toast.show({
        type: "error",
        headline: "AI quick action failed",
        message,
      }),
  };
};

export const parseQuickActionError = (error: any): KaiQuickActionError => {
  try {
    const parsed = JSON.parse(error.message || "{}");

    // AI service's FastAPI framework adds the `detail` property.
    // In case we migrate to Go in the future (no `detail` property), we fallback to the root object here
    const errorData = parsed.detail || parsed;

    if (errorData.code && errorData.message) {
      return errorData as KaiQuickActionError;
    }
  } catch {
    // Not JSON or parsing failed
  }

  return {
    code: KaiQuickActionError.CodeEnum.UNKNOWN,
    message: error.message || "An unexpected error occurred.",
  };
};
