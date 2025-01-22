import { onUnmounted, ref } from "vue";

import { type Alert } from "@knime/ui-extension-renderer/api";

import { getToastsProvider } from "@/plugins/toasts";

import {
  type NodeInfoParam,
  getHeadline,
  getMessage,
} from "./utils/uiExtensionAlert";

export const useNotifyUIExtensionAlert = () => {
  const activeToastId = ref<string | null>(null);
  const $toast = getToastsProvider();

  const removeActiveToast = () => {
    if (activeToastId.value) {
      $toast.remove(activeToastId.value);
      activeToastId.value = null;
    }
  };

  const notify = (alert: Alert, nodeInfo: NodeInfoParam) => {
    removeActiveToast();

    const toastType = alert.type === "warn" ? "warning" : "error";
    activeToastId.value = $toast.show({
      headline: getHeadline(toastType, nodeInfo),
      message: getMessage(alert),
      type: toastType,
      autoRemove: alert.type !== "error",
    });
  };

  onUnmounted(() => {
    removeActiveToast();
  });

  return { notify, removeActiveToast };
};
