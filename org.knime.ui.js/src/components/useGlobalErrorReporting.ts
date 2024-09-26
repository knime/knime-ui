import { onBeforeUnmount, onErrorCaptured, onMounted } from "vue";
import { showErrorToast } from "@/util/errorHandling";
import { UnknownGatewayException } from "@/api/gateway-api/generated-api";

export const useGlobalErrorReporting = () => {
  onErrorCaptured((_error) => {
    consola.error("Error captured hook :: ", { error: _error });
    return false; // Stop error propagation
  });

  const logUnhandledPromiseRejection = (event: PromiseRejectionEvent) => {
    consola.error("Unhandled rejection::", { event });

    const error = event.reason;
    if (error instanceof UnknownGatewayException) {
      showErrorToast({
        headline: "An unexpected error occurred",
        problemDetails: {
          title: error.message,
          details: [], // We could add more details here
        },
        error: error as Error,
        copyToClipboard: true,
      });
    }
  };

  onMounted(() => {
    window.addEventListener("unhandledrejection", logUnhandledPromiseRejection);
  });

  onBeforeUnmount(() => {
    window.removeEventListener(
      "unhandledrejection",
      logUnhandledPromiseRejection,
    );
  });
};
