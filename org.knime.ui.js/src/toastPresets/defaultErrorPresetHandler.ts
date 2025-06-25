import type { Toast, ToastServiceProvider } from "@knime/components";
import { rfcErrors } from "@knime/hub-features";

import { isUnknownApiError } from "@/api/gateway-api/generated-exceptions";
import { showProblemDetailsErrorToast } from "@/util/showProblemDetailsErrorToast";

/**
 * Offers specialized handling for instances of UnknownGatewayException and RFCError. In other cases the toast payload is used
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
  const genericHeadline = "An unexpected error occurred";

  if (isUnknownApiError(error)) {
    return showProblemDetailsErrorToast({
      headline: payload.headline ?? genericHeadline,
      problemDetails: {
        title: error.data.title,
        details: [],
      },
      error,
      copyToClipboard: true,
    });
  }

  if (error instanceof rfcErrors.RFCError) {
    return $toast.show(
      rfcErrors.toToast({
        headline: payload.headline ?? genericHeadline,
        rfcError: error,
      }),
    );
  }

  if (error instanceof Error) {
    payload.message ??= error.message;
  }

  return $toast.show(payload);
};
