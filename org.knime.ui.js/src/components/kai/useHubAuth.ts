import { computed } from "vue";
import { storeToRefs } from "pinia";

import { isBrowser, runInEnvironment } from "@/environment";
import { useAIAssistantStore } from "@/store/aiAssistant";
import { useSpaceAuthStore } from "@/store/spaces/auth";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { getToastPresets } from "@/toastPresets";

let isHubIdFetched = false;

const useHubAuth = () => {
  const { hubID } = storeToRefs(useAIAssistantStore());
  const { getHubID } = useAIAssistantStore();
  const { spaceProviders } = storeToRefs(useSpaceProvidersStore());
  const { connectProvider } = useSpaceAuthStore();

  runInEnvironment({
    DESKTOP: () => {
      // Fetch hubID from the backend only once.
      if (!isHubIdFetched) {
        getHubID();
        isHubIdFetched = true;
      }
    },
  });

  const isHubConfigured = computed(() => Boolean(hubID.value) || isBrowser);

  const isAuthenticated = computed(() => {
    return spaceProviders.value?.[hubID.value ?? ""]?.connected || isBrowser;
  });

  const userName = computed(() => {
    return spaceProviders.value?.[hubID.value ?? ""]?.user?.name ?? null;
  });

  const { toastPresets } = getToastPresets();

  const authenticateWithHub = async () => {
    if (!hubID.value) {
      return;
    }

    try {
      await connectProvider({
        spaceProviderId: hubID.value,
      });
    } catch (error) {
      const providerName = spaceProviders.value?.[hubID.value ?? ""]?.name;
      toastPresets.spaces.auth.connectFailed({ error, providerName });
    }
  };

  return {
    isAuthenticated,
    isHubConfigured,
    hubID,
    userName,
    authenticateWithHub,
  };
};

export { useHubAuth };
