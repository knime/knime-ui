import { computed, ref, type Ref } from "vue";

import { useFeatures } from "@/plugins/feature-flags";

import ChatPanel from "./chat/ChatPanel.vue";
import DisclaimerPanel from "./DisclaimerPanel.vue";
import ErrorPanel from "./ErrorPanel.vue";
import InstallationPanel from "./InstallationPanel.vue";
import LoginPanel from "./LoginPanel.vue";
import NoHubConfiguredPanel from "./NoHubConfiguredPanel.vue";

import { useHubAuth } from "./useHubAuth";
import { useKaiServer } from "./useKaiServer";
import type { KaiMode } from "./types";
import QuickBuild from "./quickBuild/QuickBuild.vue";

const isDisclaimerOpen = ref(true);

export const useKaiPanels = ({
  nodeId,
  mode,
}: { nodeId?: string | null; mode?: Ref<KaiMode> } = {}) => {
  const { isKaiInstalled: _isKaiInstalled } = useFeatures();
  const isKaiInstalled = _isKaiInstalled();
  const { isHubConfigured, isAuthenticated } = useHubAuth();
  const { isServerAvailable, hasDisclaimer } = useKaiServer();

  const closeDisclaimer = () => {
    isDisclaimerOpen.value = false;
  };
  const showDisclaimer = computed(
    () => hasDisclaimer.value && isDisclaimerOpen.value,
  );

  // Dynamically select which component to show
  const component = computed(() => {
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
    if (showDisclaimer.value) {
      return DisclaimerPanel;
    }
    if (mode?.value === "quick-build") {
      return QuickBuild;
    }

    return ChatPanel;
  });

  const componentListeners = computed(() => {
    if (component.value === DisclaimerPanel) {
      return { close: closeDisclaimer };
    } else {
      return {};
    }
  });

  const componentProps = computed(() => {
    if (component.value === QuickBuild) {
      return {
        nodeId: nodeId,
      };
    }

    if (component.value === ChatPanel) {
      return {
        chainType: mode?.value === "build" ? "build" : "qa",
      };
    }

    return {};
  });

  return {
    component,
    componentListeners,
    componentProps,
  };
};

useKaiPanels;
