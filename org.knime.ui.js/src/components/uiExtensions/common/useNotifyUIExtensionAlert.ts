import { onUnmounted, ref } from "vue";
import { capitalize } from "lodash-es";
import type { Alert } from "@knime/ui-extension-service";

import { getToastsProvider } from "@/plugins/toasts";

export const useNotifyUIExtensionAlert = () => {
  const activeToastId = ref<string | null>(null);
  const $toast = getToastsProvider();

  const removeActiveToast = () => {
    if (activeToastId.value) {
      $toast.remove(activeToastId.value);
      activeToastId.value = null;
    }
  };

  const notify = (alert: Alert) => {
    removeActiveToast();

    const toastType = alert.type === "warn" ? "warning" : "error";

    const headline = alert.nodeInfo
      ? `${alert.nodeInfo?.nodeName} (${alert.nodeId})`
      : `${capitalize(toastType)} (${alert.nodeId})`;

    activeToastId.value = $toast.show({
      headline,
      message: alert.message,
      type: toastType,
      autoRemove: alert.type !== "error",
    });
  };

  onUnmounted(() => {
    removeActiveToast();
  });

  return { notify };
};
