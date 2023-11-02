import { computed, watch, ref } from "vue";
import { useStore } from "@/composables/useStore";
import { TABS } from "@/store/panel";
import type { NodeTemplate } from "@/api/gateway-api/generated-api";

const selectedNodeTemplate = ref<NodeTemplate | null>(null);

const useNodeDescriptionPanel = (shouldWatch = false) => {
  const store = useStore();

  const isSideBarOpen = computed(() => store.state.panel.isExtensionPanelOpen);

  const isKaiActive = computed(() => {
    const activeProjectId = store.state.application.activeProjectId;
    return (
      isSideBarOpen.value &&
      store.state.panel.activeTab[activeProjectId] === TABS.AI_CHAT
    );
  });

  if (shouldWatch) {
    watch(isSideBarOpen, (isOpen) => {
      if (!isOpen) {
        setTimeout(() => {
          selectedNodeTemplate.value = null;
          // eslint-disable-next-line no-magic-numbers
        }, 50);
      }
    });
  }

  const toggleNodeDescription = ({ isSelected, nodeTemplate }) => {
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
    isSideBarOpen,
    isKaiActive,
    toggleNodeDescription,
    closeNodeDescription,
    selectedNodeTemplate,
  };
};

export default useNodeDescriptionPanel;
