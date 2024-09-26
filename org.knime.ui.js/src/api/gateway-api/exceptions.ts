import { getToastsProvider } from "@/plugins/toasts";

const $toast = getToastsProvider();

/**
 * An exception that is thrown by failed store actions. The general idea is to wrap failed API calls in this exception
 * s.t. the error message can be displayed.
 */
export class StoreActionException extends Error {
  cause: Error;

  constructor(message: string, cause: Error) {
    super(message, { cause });
    this.cause = cause;
  }
}

/**
 * Displays a toast message with the error message of a store action exception.
 *
 * @param error The store action exception.
 */
export const displayStoreActionExceptionMessage = (
  error: StoreActionException,
) => {
  $toast.show({
    type: "error",
    headline: error.message,
    message: error.cause.message,
    autoRemove: true,
  });
};
