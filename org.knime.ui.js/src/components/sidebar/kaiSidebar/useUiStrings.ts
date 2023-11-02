import { ref, reactive } from "vue";
import { API } from "@api";
import type { UiStrings } from "./types";

const isServerAvailable = ref(true);
const isLoading = ref(false);
const uiStrings = reactive<UiStrings>(null);

const fetchUiStrings = async () => {
  if (isLoading.value) {
    return;
  }

  isLoading.value = true;
  try {
    Object.assign(uiStrings, await API.desktop.getUiStrings());
  } catch (error) {
    isServerAvailable.value = false;
  } finally {
    isLoading.value = false;
  }
};

fetchUiStrings();

const useUiStrings = () => {
  return {
    uiStrings,
    isLoading,
    isServerAvailable,
    fetchUiStrings,
  };
};

export default useUiStrings;
