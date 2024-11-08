import { computed, ref } from "vue";

import { useFeatures } from "@/plugins/feature-flags";
import { useHubAuth } from "../useHubAuth";
import { useKaiServer } from "../useKaiServer";

import DisclaimerPanel from "./DisclaimerPanel.vue";
import ErrorPanel from "./ErrorPanel.vue";
import InstallationPanel from "./InstallationPanel.vue";
import LoginPanel from "./LoginPanel.vue";
import NoHubConfiguredPanel from "./NoHubConfiguredPanel.vue";

const isDisclaimerOpen = ref(true);

export const useKaiPanels = () => {
  const { isKaiInstalled: _isKaiInstalled } = useFeatures();
  const isKaiInstalled = _isKaiInstalled();
  const { isHubConfigured, isAuthenticated } = useHubAuth();
  const { isServerAvailable, hasDisclaimer } = useKaiServer();

  const closeDisclaimer = () => {
    isDisclaimerOpen.value = false;
  };
  const shouldShowDisclaimer = computed(
    () => hasDisclaimer.value && isDisclaimerOpen.value,
  );

  // Dynamically select which panel to show
  const panelComponent = computed(() => {
    if (!isKaiInstalled) {
      return InstallationPanel;
    }
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

  const panelComponentListeners = computed(() => {
    if (panelComponent.value === DisclaimerPanel) {
      return { close: closeDisclaimer };
    } else {
      return {};
    }
  });

  return {
    panelComponent,
    panelComponentListeners,
  };
};
