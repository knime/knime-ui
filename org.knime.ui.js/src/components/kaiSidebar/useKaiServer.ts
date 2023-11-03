import { ref, reactive } from "vue";
import { API } from "@api";
import type { UiStrings } from "./types";

const isServerAvailable = ref(true);
const isLoading = ref(false);
const uiStrings = reactive<UiStrings | Record<string, never>>({});

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
    isServerAvailable.value = false;
  } finally {
    isLoading.value = false;
  }
};

fetchUiStrings();

const useKaiServer = () => {
  return {
    uiStrings: uiStrings as UiStrings,
    isLoading,
    isServerAvailable,
    fetchUiStrings,
  };
};

export default useKaiServer;
