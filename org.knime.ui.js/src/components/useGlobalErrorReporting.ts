import { onBeforeUnmount, onErrorCaptured, onMounted } from "vue";

export const useGlobalErrorReporting = () => {
  onErrorCaptured((_error) => {
    consola.error("Error captured hook :: ", { error: _error });
  });

  const logUnhandledPromiseRejection = (event: PromiseRejectionEvent) => {
    consola.error("Unhandled rejection::", { event });
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
