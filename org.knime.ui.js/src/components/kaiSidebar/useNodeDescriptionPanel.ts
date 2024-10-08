import { computed, ref } from "vue";

import type { NodeTemplate } from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";
import { TABS } from "@/store/panel";

const selectedNodeTemplate = ref<NodeTemplate | null>(null);

const useNodeDescriptionPanel = () => {
  const store = useStore();

  const isExtensionPanelOpen = computed(
    () => store.state.panel.isExtensionPanelOpen,
  );

  const isKaiActive = computed(() => {
    const activeProjectId = store.state.application.activeProjectId;
    return (
      activeProjectId &&
      isExtensionPanelOpen.value &&
      store.state.panel.activeTab[activeProjectId] === TABS.KAI
    );
  });

  const clearSelectedNodeTemplate = () => {
    setTimeout(() => {
      selectedNodeTemplate.value = null;
      // eslint-disable-next-line no-magic-numbers
    }, 50);
  };

  const toggleNodeDescription = ({
    isSelected,
    nodeTemplate,
  }: {
    isSelected: boolean;
    nodeTemplate: NodeTemplate;
  }) => {
    if (isSelected) {
      store.dispatch("panel/closeExtensionPanel");
    } else {
      store.dispatch("panel/openExtensionPanel");
      selectedNodeTemplate.value = nodeTemplate;
    }
  };

  const closeNodeDescription = () => {
    store.dispatch("panel/closeExtensionPanel");
  };

  return {
    isKaiActive,
    isExtensionPanelOpen,
    clearSelectedNodeTemplate,
    toggleNodeDescription,
    closeNodeDescription,
    selectedNodeTemplate,
  };
};

export { useNodeDescriptionPanel };
