import { reactive, ref } from "vue";
import { API } from "@api";

import { sleep } from "@knime/utils";

import type { KaiUiStrings } from "@/api/gateway-api/generated-api";

const SLEEP_AFTER_ERROR = 2000;

const isServerAvailable = ref(false);
const isLoading = ref(false);
const uiStrings = reactive<Partial<KaiUiStrings>>({});

const fetchUiStrings = async () => {
  if (isLoading.value) {
    return;
  }

  isLoading.value = true;
  try {
    const _uiStrings = await API.kai.getUiStrings({});
    Object.assign(uiStrings, _uiStrings);
    isServerAvailable.value = true;
  } catch (_error) {
    // we want to show the loading indicator for at least 2 seconds
    await sleep(SLEEP_AFTER_ERROR);
    isServerAvailable.value = false;
  } finally {
    isLoading.value = false;
  }
};

const useKaiServer = () => {
  return {
    uiStrings,
    isLoading,
    isServerAvailable,
    fetchUiStrings,
  };
};

export { useKaiServer, fetchUiStrings };
