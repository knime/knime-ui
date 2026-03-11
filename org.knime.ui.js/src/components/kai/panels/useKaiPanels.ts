import { computed } from "vue";
import { storeToRefs } from "pinia";

import { useAiProviderStore } from "@/store/ai/aiProvider";

import DisclaimerPanel from "./DisclaimerPanel.vue";
import ErrorPanel from "./ErrorPanel.vue";
import LoginPanel from "./LoginPanel.vue";
import NoHubConfiguredPanel from "./NoHubConfiguredPanel.vue";
import UnlicensedPanel from "./UnlicensedPanel.vue";
import { useDisclaimer } from "./useDisclaimer";

export const useKaiPanels = () => {
  const {
    isAiProviderConfigured,
    isAiProviderConnected,
    isUserLicensed,
    isAiBackendAvailable,
  } = storeToRefs(useAiProviderStore());
  const { shouldShowDisclaimer } = useDisclaimer();

  // Dynamically select which panel to show
  const panelComponent = computed(() => {
    if (!isAiProviderConfigured.value) {
      return NoHubConfiguredPanel;
    }
    if (!isAiBackendAvailable.value) {
      return ErrorPanel;
    }
    if (!isAiProviderConnected.value) {
      return LoginPanel;
    }
    if (!isUserLicensed.value) {
      return UnlicensedPanel;
    }
    if (shouldShowDisclaimer.value) {
      return DisclaimerPanel;
    }

    return null;
  });

  return { panelComponent };
};
