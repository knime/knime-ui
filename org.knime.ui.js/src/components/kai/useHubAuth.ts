import { computed } from "vue";

import { useStore } from "@/composables/useStore";
import { isBrowser, runInEnvironment } from "@/environment";
import { getToastPresets } from "@/toastPresets";

let isHubIdFetched = false;

const useHubAuth = () => {
  const store = useStore();

  runInEnvironment({
    DESKTOP: () => {
      // Fetch hubID from the backend only once.
      if (!isHubIdFetched) {
        store.dispatch("aiAssistant/getHubID");
        isHubIdFetched = true;
      }
    },
  });

  const hubId = computed(() => store.state.aiAssistant.hubID);

  const isHubConfigured = computed(() => Boolean(hubId.value) || isBrowser);

  const isAuthenticated = computed(() => {
    return (
      store.state.spaces.spaceProviders?.[hubId.value ?? ""]?.connected ||
      isBrowser
    );
  });

  const userName = computed(() => {
    return (
      store.state.spaces.spaceProviders?.[hubId.value ?? ""]?.user?.name ?? null
    );
  });

  const { toastPresets } = getToastPresets();

  const authenticateWithHub = async () => {
    try {
      await store.dispatch("spaces/connectProvider", {
        spaceProviderId: hubId.value,
      });
    } catch (error) {
      const providerName =
        store.state.spaces.spaceProviders?.[hubId.value ?? ""]?.name;
      toastPresets.spaces.auth.connectFailed({ error, providerName });
    }
  };

  return {
    isAuthenticated,
    isHubConfigured,
    hubId,
    userName,
    authenticateWithHub,
  };
};

export { useHubAuth };
