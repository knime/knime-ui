import { computed } from "vue";
import { useStore } from "@/composables/useStore";
import { isBrowser } from "@/environment";

// If the app is running in the browser, we do not need a hubId.
let isHubIdReadyOrNotNeeded = isBrowser;

const useHubAuth = () => {
  const store = useStore();

  // Fetch hubID from the backend only once.
  if (!isHubIdReadyOrNotNeeded) {
    store.dispatch("aiAssistant/getHubID");
    isHubIdReadyOrNotNeeded = true;
  }

  const hubId = computed(() => store.state.aiAssistant.hubID);

  const isHubConfigured = computed(() => Boolean(hubId.value));

  const isAuthenticated = computed(() => {
    return store.state.spaces.spaceProviders?.[hubId.value ?? ""]?.connected;
  });

  const authenticateWithHub = () => {
    store.dispatch("spaces/connectProvider", { spaceProviderId: hubId.value });
  };

  return {
    isAuthenticated,
    isHubConfigured,
    hubId,
    authenticateWithHub,
  };
};

export { useHubAuth };
