import { computed, watch, ref } from "vue";
import { useStore } from "@/composables/useStore";
import { TABS } from "@/store/panel";
import type { NodeTemplate } from "@/api/gateway-api/generated-api";

const selectedNodeTemplate = ref<NodeTemplate | null>(null);

let hasWatcherBeenAdded = false;

const useNodeDescriptionPanel = () => {
  const store = useStore();

  const isSideBarOpen = computed(() => store.state.panel.isExtensionPanelOpen);

  const isKaiActive = computed(() => {
    const activeProjectId = store.state.application.activeProjectId;
    return store.state.panel.activeTab[activeProjectId] === TABS.AI_CHAT;
  });

  if (!hasWatcherBeenAdded) {
    watch(isSideBarOpen, (isOpen) => {
      if (!isOpen) {
        setTimeout(() => {
          selectedNodeTemplate.value = null;
          // eslint-disable-next-line no-magic-numbers
        }, 50);
      }
    });
    hasWatcherBeenAdded = true;
  }

  const toggleNodeDescription = ({ isSelected, nodeTemplate }) => {
    if (!isSelected) {
      store.dispatch("panel/openExtensionPanel");
      selectedNodeTemplate.value = nodeTemplate;
      return;
    }

    store.dispatch("panel/closeExtensionPanel");
  };

  const closeNodeDescription = () => {
    store.dispatch("panel/closeExtensionPanel");
  };

  return {
    isSideBarOpen,
    isKaiActive,
    toggleNodeDescription,
    closeNodeDescription,
  };
};

export default useNodeDescriptionPanel;
