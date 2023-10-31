import { ref, reactive } from "vue";
import { API } from "@api";

let isHubStringsFetched = false;

const isServerAvailable = ref(true);
const isLoading = ref(false);
const uiStrings = reactive({});

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

const useUiStrings = () => {
  // Fetch hubID from the backend only once.
  // TODO: maybe put on the top level?
  if (!isHubStringsFetched) {
    isHubStringsFetched = true;
    fetchUiStrings();
  }

  return {
    uiStrings,
    isLoading,
    isServerAvailable,
    fetchUiStrings,
  };
};

export default useUiStrings;
