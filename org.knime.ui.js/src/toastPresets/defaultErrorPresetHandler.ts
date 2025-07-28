/* eslint-disable no-undefined */
import type { Toast, ToastServiceProvider } from "@knime/components";
import { rfcErrors } from "@knime/hub-features";

import { isApiError } from "@/api/gateway-api/generated-exceptions";
import { isValidDate } from "@/util/date-time";

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

  if (isApiError(error)) {
    const { data } = error;
    const date =
      data.date && isValidDate(data.date) ? new Date(data.date) : undefined;

    const rfcError = new rfcErrors.RFCError({
      title: data.title,
      date,
      requestId: data["x-request-id"],
      status: data.status ?? error.code,
      details: data.details,
    });

    return $toast.show(
      rfcErrors.toToast({
        headline: payload.headline ?? genericHeadline,
        rfcError,
        canCopyToClipboard: data.canCopy,
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
