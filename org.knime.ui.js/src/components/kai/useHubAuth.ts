import { computed } from "vue";
import { useRouter } from "vue-router";

import { useStore } from "@/composables/useStore";
import { isBrowser, runInEnvironment } from "@/environment";
import { getToastsProvider } from "@/plugins/toasts";

let isHubIdFetched = false;

const useHubAuth = () => {
  const store = useStore();
  const $toast = getToastsProvider();

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

  const authenticateWithHub = async () => {
    try {
      await store.dispatch("spaces/connectProvider", {
        spaceProviderId: hubId.value,
      });
    } catch (error) {
      $toast.show({
        type: "error",
        message: "Could not connect to Hub",
      });
    }
  };

  const disconnectHub = async () => {
    if (!hubId.value) {
      return;
    }

    await store.dispatch("spaces/disconnectProvider", {
      spaceProviderId: hubId.value,
      $router: useRouter(),
    });
  };

  const isAuthError = (errorMessage: string) => {
    return Boolean(
      errorMessage.startsWith("Could not authorize") ||
        errorMessage.startsWith("Failed to authenticate"),
    );
  };

  return {
    isAuthenticated,
    isHubConfigured,
    hubId,
    userName,
    authenticateWithHub,
    disconnectHub,
    isAuthError,
  };
};

export { useHubAuth };
