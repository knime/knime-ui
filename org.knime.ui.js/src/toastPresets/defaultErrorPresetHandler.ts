import type { Toast, ToastServiceProvider } from "@knime/components";

import { UnknownGatewayException } from "@/api/gateway-api/generated-exceptions";
import { showProblemDetailsErrorToast } from "@/util/showProblemDetailsErrorToast";

/**
 * For UnknownGatewayException a problem detail toast is shown in other cases the toast payload is used
 * and filled with the error message if no message was given.
 * @param $toast
 * @param error
 * @param payload
 * @returns toast id
 */
export const defaultErrorPresetHandler = (
  $toast: ToastServiceProvider,
  error: unknown,
  payload: Toast,
) => {
  // unknown error handling
  if (error instanceof UnknownGatewayException) {
    return showProblemDetailsErrorToast({
      headline: payload.headline ?? "An unexpected error occurred",
      problemDetails: {
        title: error.message,
        details: [], // We could add more details here
      },
      error: error as Error,
      copyToClipboard: true,
    });
  }

  if (error instanceof Error) {
    payload.message ??= error.message;
  }

  return $toast.show(payload);
};
