import { computed } from "vue";

import { useHubAuth } from "../useHubAuth";
import { useKaiServer } from "../useKaiServer";

import DisclaimerPanel from "./DisclaimerPanel.vue";
import ErrorPanel from "./ErrorPanel.vue";
import LoginPanel from "./LoginPanel.vue";
import NoHubConfiguredPanel from "./NoHubConfiguredPanel.vue";
import { useDisclaimer } from "./useDisclaimer";

export const useKaiPanels = () => {
  const { isHubConfigured, isAuthenticated } = useHubAuth();
  const { isServerAvailable } = useKaiServer();
  const { shouldShowDisclaimer } = useDisclaimer();

  // Dynamically select which panel to show
  const panelComponent = computed(() => {
    if (!isHubConfigured.value) {
      return NoHubConfiguredPanel;
    }
    if (!isServerAvailable.value) {
      return ErrorPanel;
    }
    if (!isAuthenticated.value) {
      return LoginPanel;
    }
    if (shouldShowDisclaimer.value) {
      return DisclaimerPanel;
    }

    return null;
  });

  return { panelComponent };
};
