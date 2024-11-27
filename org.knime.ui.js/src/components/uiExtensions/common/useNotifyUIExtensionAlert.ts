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

  // TODO: UIEXT-2287 Remove this once the Alert API of UI Extensions is reworked
  const invalidSubtitles = [
    "Expand for details", // Message for too long warnings
    "Something went wrong", // Default error message
    "",
  ];
  const extractValidSubtitle = (alert: Alert) => {
    if (!alert.subtitle || invalidSubtitles.includes(alert.subtitle)) {
      return null;
    }
    return alert.subtitle;
  };

  const notify = (alert: Alert, nodeConfig?: boolean) => {
    removeActiveToast();

    const toastType = alert.type === "warn" ? "warning" : "error";

    const headline = alert.nodeInfo
      ? `${alert.nodeInfo?.nodeName} (${alert.nodeId})`
      : `${capitalize(toastType)} (${alert.nodeId})`;

    const validSubtitle = extractValidSubtitle(alert);
    activeToastId.value = $toast.show({
      headline: nodeConfig ? "Invalid node settings" : headline,
      message: validSubtitle
        ? `${validSubtitle}\n\n${alert.message}`
        : alert.message,
      type: toastType,
      autoRemove: alert.type !== "error",
    });
  };

  onUnmounted(() => {
    removeActiveToast();
  });

  return { notify, removeActiveToast };
};
