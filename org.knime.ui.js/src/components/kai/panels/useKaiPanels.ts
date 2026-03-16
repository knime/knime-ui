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
  const { providerStatus, licensingStatus } = storeToRefs(useAiProviderStore());
  const { shouldShowDisclaimer } = useDisclaimer();

  const panelComponent = computed(() => {
    switch (providerStatus.value) {
      case "unconfigured":
        return NoHubConfiguredPanel;
      case "checkingBackend":
      case "backendUnavailable":
        return ErrorPanel;
      case "backendAvailable":
        return LoginPanel;
    }

    if (!licensingStatus.value.licensed) {
      return UnlicensedPanel;
    }
    if (shouldShowDisclaimer.value) {
      return DisclaimerPanel;
    }

    return null;
  });

  return { panelComponent };
};
