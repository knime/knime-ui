/* eslint-disable no-undefined */
import type { Toast, ToastServiceProvider } from "@knime/components";
import { rfcErrors } from "@knime/hub-features";

import { isValidAPIError } from "@/api/gateway-api/generated-exceptions";
import { isValidDate } from "@/util/date-time";

/**
 * Offers specialized handling for instances of API Gateway errors (both expected and unexpected),
 * Desktop API errors and Hub API RFCError (e.g requests made directly o the Hub API while in the browser).
 * It will format and display the information inside the error object appropriately in a toast
 * given that the contents match the structure of an RFC-9457 error. Failing to parse the error
 * as such, it simply shows a basic toast with the error's message property
 *
 * @param $toast
 * @param error
 * @param payload
 * @returns toast id
 */
export const defaultAPIErrorHandler = (
  $toast: ToastServiceProvider,
  error: unknown,
  payload: Toast,
) => {
  const genericHeadline = "An unexpected error occurred";

  if (isValidAPIError(error)) {
    const date =
      error.date && isValidDate(error.date) ? new Date(error.date) : undefined;

    const rfcError = new rfcErrors.RFCError({
      title: error.title,
      date,
      status: error.status,
      details: error.details,
      requestId: error["x-request-id"],
      errorId: error["x-error-id"],
      stacktrace: error.stackTrace,
    });

    return $toast.show(
      rfcErrors.toToast({
        headline: payload.headline ?? genericHeadline,
        rfcError,
        canCopyToClipboard: error.canCopy,
      }),
    );
  }

  if (error instanceof rfcErrors.RFCError) {
    return $toast.show(
      rfcErrors.toToast({
        headline: payload.headline ?? genericHeadline,
        rfcError: error,
        canCopyToClipboard: true,
      }),
    );
  }

  if (error instanceof Error) {
    payload.message ??= error.message;
  }

  return $toast.show(payload);
};
