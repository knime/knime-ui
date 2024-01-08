import { ref, reactive, computed } from "vue";
import sleep from "webapps-common/util/sleep";
import { API } from "@api";
import type { UiStrings } from "./types";

const SLEEP_AFTER_ERROR = 2000;

const isServerAvailable = ref(false);
const isLoading = ref(false);
const uiStrings = reactive<UiStrings | Record<string, never>>({});
const hasDisclaimer = computed(() => Boolean(uiStrings.disclaimer));

const fetchUiStrings = async () => {
  if (isLoading.value) {
    return;
  }

  isLoading.value = true;
  try {
    const _uiStrings = await API.desktop.getUiStrings();
    Object.assign(uiStrings, _uiStrings);
    isServerAvailable.value = true;
  } catch (error) {
    // we want to show the loading indicator for at least 2 seconds
    await sleep(SLEEP_AFTER_ERROR);
    isServerAvailable.value = false;
  } finally {
    isLoading.value = false;
  }
};

fetchUiStrings();

const useKaiServer = () => {
  return {
    uiStrings: uiStrings as UiStrings,
    hasDisclaimer,
    isLoading,
    isServerAvailable,
    fetchUiStrings,
  };
};

export { useKaiServer, fetchUiStrings };
