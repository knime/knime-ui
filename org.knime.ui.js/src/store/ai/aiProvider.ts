import { computed, reactive, ref } from "vue";
import { API } from "@api";
import { defineStore, storeToRefs } from "pinia";
import { useRouter } from "vue-router";

import { sleep } from "@knime/utils";

import type { KaiUiStrings } from "@/api/gateway-api/generated-api";
import { isBrowser, runInEnvironment } from "@/environment";
import { getToastPresets } from "@/services/toastPresets";
import { useSpaceAuthStore } from "@/store/spaces/auth";
import { useSpaceProvidersStore } from "@/store/spaces/providers";

import { useAIAssistantStore } from "./aiAssistant";

const SLEEP_AFTER_ERROR = 2000;

/**
 * K-AI and other AI features require a specific Hub to be configured to be used as their backend.
 * This is configured via AP Preferences (KNIME -> KNIME Modern UI -> AI Assistant) and can be
 * overwritten using a Customization Profile or an .ini flag.
 *
 * That Hub is the "AI Provider", the identity, reachability, connection state, and licensing of which
 * this store manages. The "AI service" deployed in the "AI Provider" is referred to as the "backend".
 * The availability of this backend is checked by fetching the UI strings, since the corresponding
 * endpoint is the only unauthenticated endpoint, which allows pinging it before the user is logged in.
 */
export const useAiProviderStore = defineStore("aiProvider", () => {
  const aiProviderId = ref<string | null>(null);

  const isAiBackendAvailable = ref(false);
  const isCheckingBackendAvailability = ref(false);
  const uiStrings = reactive<Partial<KaiUiStrings>>({});

  const isUserLicensed = ref(true);
  const unlicensedUserMessage = ref<string | null>(null);

  const { spaceProviders } = storeToRefs(useSpaceProvidersStore());

  let aiProviderIdPromise: Promise<void> | null = null;

  const fetchUiStrings = async () => {
    if (isCheckingBackendAvailability.value) {
      return;
    }

    isCheckingBackendAvailability.value = true;
    try {
      const _uiStrings = await API.kai.getUiStrings({});
      Object.assign(uiStrings, _uiStrings);
      isAiBackendAvailable.value = true;
    } catch (_error) {
      // we want to show the loading indicator for at least 2 seconds
      await sleep(SLEEP_AFTER_ERROR);
      isAiBackendAvailable.value = false;
    } finally {
      isCheckingBackendAvailability.value = false;
    }
  };

  const setUserLicensed = (
    licensed: boolean,
    message: string | null = null,
  ) => {
    isUserLicensed.value = licensed;
    unlicensedUserMessage.value = message;
  };

  const getAiProviderId = () => {
    if (aiProviderIdPromise) {
      return aiProviderIdPromise;
    }

    aiProviderIdPromise = (async () => {
      try {
        const id = await runInEnvironment({
          DESKTOP: () => API.desktop.getHubID(),
          BROWSER: () => {
            const providers = useSpaceProvidersStore().spaceProviders;
            return Promise.resolve(Object.values(providers)[0]?.id ?? null);
          },
        });
        aiProviderId.value = id ?? null;
      } finally {
        aiProviderIdPromise = null;
      }
    })();

    return aiProviderIdPromise;
  };

  const connectAiProvider = async () => {
    if (!aiProviderId.value) {
      return;
    }

    const { connectProvider } = useSpaceAuthStore();
    const { spaceProviders } = storeToRefs(useSpaceProvidersStore());
    const { toastPresets } = getToastPresets();

    try {
      await connectProvider({
        spaceProviderId: aiProviderId.value,
      });
      await useAIAssistantStore().fetchUsage();
    } catch (error) {
      const providerName =
        spaceProviders.value?.[aiProviderId.value ?? ""]?.name;
      toastPresets.spaces.auth.connectFailed({ error, providerName });
    }
  };

  const disconnectAiProvider = async () => {
    if (!aiProviderId.value) {
      return;
    }

    const { disconnectProvider } = useSpaceAuthStore();

    await disconnectProvider({
      spaceProviderId: aiProviderId.value,
      $router: useRouter(),
    });
  };

  const isAiProviderConnected = computed(() => {
    return (
      spaceProviders.value?.[aiProviderId.value ?? ""]?.connected || isBrowser()
    );
  });

  const isAiProviderConfigured = computed(() => {
    return Boolean(aiProviderId.value) || isBrowser();
  });

  const usernameForAiProvider = computed(() => {
    return spaceProviders.value?.[aiProviderId.value ?? ""]?.username ?? null;
  });

  return {
    // licensing
    isUserLicensed,
    unlicensedUserMessage,
    setUserLicensed,

    // AI service
    uiStrings,
    fetchUiStrings,
    isAiBackendAvailable,
    isCheckingBackendAvailability,

    // AI provider Hub
    aiProviderId,
    getAiProviderId,
    connectAiProvider,
    disconnectAiProvider,
    isAiProviderConnected,
    isAiProviderConfigured,
    usernameForAiProvider,
  };
});
