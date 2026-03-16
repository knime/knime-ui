import { computed, reactive, ref } from "vue";
import { API } from "@api";
import { defineStore, storeToRefs } from "pinia";
import { useRouter } from "vue-router";

import type { KaiUiStrings } from "@/api/gateway-api/generated-api";
import { runInEnvironment } from "@/environment";
import { getToastPresets } from "@/services/toastPresets";
import { useSpaceAuthStore } from "@/store/spaces/auth";
import { useSpaceProvidersStore } from "@/store/spaces/providers";

import { useAIAssistantStore } from "./aiAssistant";

export type AiProviderStatus =
  | "unconfigured"
  | "configured"
  | "checkingBackend"
  | "backendUnavailable"
  | "backendAvailable"
  | "connected";

export type LicensingStatus =
  | { licensed: true; unlicensedMessage?: never }
  | { licensed: false; unlicensedMessage: string };

/**
 * K-AI and other AI features require a specific Hub to be configured to be used as their backend.
 * This is configured via AP Preferences (KNIME -> KNIME Modern UI -> AI Assistant) and can be
 * overwritten using a Customization Profile or an .ini flag.
 *
 * That Hub is the "AI Provider", the identity, reachability, and connection state of which
 * this store manages. The "AI service" deployed in the "AI Provider" is referred to as the "backend".
 * The availability of this backend is checked by fetching the UI strings, since the corresponding
 * endpoint is the only unauthenticated endpoint, which allows pinging it before the user is logged in.
 *
 * Additionally, the AI Provider's license might restrict certain user groups (e.g. consumers) from
 * accessing AI features. That is also managed in this store.
 */
export const useAiProviderStore = defineStore("aiProvider", () => {
  const aiProviderId = ref<string | null>(null);

  const isAiBackendAvailable = ref(false);
  const isCheckingBackendAvailability = ref(false);
  const uiStrings = reactive<Partial<KaiUiStrings>>({});

  const licensingStatus = ref<LicensingStatus>({ licensed: true });

  const { spaceProviders } = storeToRefs(useSpaceProvidersStore());

  let aiProviderIdPromise: Promise<void> | null = null;
  let uiStringsPromise: Promise<void> | null = null;

  const markUserAsLicensed = () => {
    licensingStatus.value = { licensed: true };
  };

  const markUserAsUnlicensed = (message: string) => {
    licensingStatus.value = { licensed: false, unlicensedMessage: message };
  };

  const fetchUiStrings = ({ force = false } = {}) => {
    if (force) {
      uiStringsPromise = null;
    }

    if (uiStringsPromise) {
      return uiStringsPromise;
    }

    uiStringsPromise = (async () => {
      isCheckingBackendAvailability.value = true;
      try {
        const _uiStrings = await API.kai.getUiStrings({});
        Object.assign(uiStrings, _uiStrings);
        isAiBackendAvailable.value = true;
      } catch (error) {
        consola.error("Failed to fetch UI strings from AI provider", error);
        isAiBackendAvailable.value = false;
      } finally {
        isCheckingBackendAvailability.value = false;
      }
    })();

    return uiStringsPromise;
  };

  const fetchAiProviderId = ({ force = false } = {}) => {
    if (force) {
      aiProviderIdPromise = null;
    }

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
      } catch (error) {
        consola.error("Failed to fetch AI provider ID", error);
      }
    })();

    return aiProviderIdPromise;
  };

  const connectAiProvider = async () => {
    await fetchAiProviderId();

    if (!aiProviderId.value) {
      consola.warn("Could not connect, no AI Provider ID available.");
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
    await fetchAiProviderId();

    if (!aiProviderId.value) {
      consola.warn("Could not disconnect, no AI Provider ID available.");
      return;
    }

    const { disconnectProvider } = useSpaceAuthStore();

    await disconnectProvider({
      spaceProviderId: aiProviderId.value,
      $router: useRouter(),
    });
  };

  const isAiProviderConfigured = computed(() => {
    return Boolean(aiProviderId.value);
  });

  const isAiProviderConnected = computed(() => {
    if (!aiProviderId.value) {
      return false;
    }

    const aiProvider = spaceProviders.value[aiProviderId.value];
    if (!aiProvider) {
      return false;
    }

    return aiProvider.connected;
  });

  /**
   * @example
   *               ┌───────────────┐
   *               │ unconfigured  │ no Hub configured for K-AI
   *               └───────┬───────┘
   *               ┌───────┴───────┐
   *               │  configured   │
   *               └───────┬───────┘
   *             ┌─────────┴─────────┐
   *             │  checkingBackend  │ pinging AI service of the configured Hub
   *             └─────────┬─────────┘
   *          ┌────────────┴───────────┐
   *┌─────────┴──────────┐   ┌─────────┴─────────┐
   *│ backendUnavailable │   │ backendAvailable  │ user needs to log in to Hub
   *└────────────────────┘   └─────────┬─────────┘
   *                           ┌───────┴───────┐
   *                           │     ready     │ AI service available, user logged in
   *                           └───────────────┘
   */
  const providerStatus = computed((): AiProviderStatus => {
    if (!isAiProviderConfigured.value) {
      return "unconfigured";
    }
    if (isCheckingBackendAvailability.value) {
      return "checkingBackend";
    }
    if (!isAiBackendAvailable.value) {
      return "backendUnavailable";
    }
    if (!isAiProviderConnected.value) {
      return "backendAvailable";
    }
    return "connected";
  });

  const usernameForAiProvider = computed(() => {
    return spaceProviders.value?.[aiProviderId.value ?? ""]?.username ?? null;
  });

  return {
    // licensing
    licensingStatus,
    markUserAsLicensed,
    markUserAsUnlicensed,

    // AI service
    uiStrings,
    fetchUiStrings,
    isAiBackendAvailable,
    isCheckingBackendAvailability,

    // AI provider Hub
    aiProviderId,
    fetchAiProviderId,
    connectAiProvider,
    disconnectAiProvider,
    usernameForAiProvider,
    providerStatus,
  };
});
