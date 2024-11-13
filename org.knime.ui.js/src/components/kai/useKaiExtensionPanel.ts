import { computed, ref } from "vue";

import type { NodeTemplate } from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";
import type { HubItem } from "@/store/aiAssistant";

import type { Extensions } from "./types";

type PanelMode = null | "node_description" | "additional_resources";

const panelMode = ref<PanelMode>(null);
const selectedNodeTemplate = ref<NodeTemplate | null>(null);

export interface AdditionalResource {
  references: { [refName: string]: string[] };
  workflows: HubItem[];
  components: HubItem[];
  extensions: Extensions;
}

const additionalResources = ref<AdditionalResource | null>(null);

export const useKaiExtensionPanel = () => {
  const store = useStore();

  const isExtensionPanelOpen = computed(
    () => store.state.panel.isExtensionPanelOpen,
  );

  const openKaiExtensionPanel = (_panelMode: PanelMode) => {
    panelMode.value = _panelMode;
    store.dispatch("panel/openExtensionPanel");
  };

  const closeKaiExtensionPanel = () => {
    panelMode.value = null;
    store.dispatch("panel/closeExtensionPanel");
  };

  const toggleNodeDescription = ({
    isSelected,
    nodeTemplate,
  }: {
    isSelected: boolean;
    nodeTemplate: NodeTemplate;
  }) => {
    if (isSelected) {
      closeKaiExtensionPanel();
    } else {
      openKaiExtensionPanel("node_description");
      selectedNodeTemplate.value = nodeTemplate;
    }
  };

  const openAdditionalResources = (
    _additionalResources: AdditionalResource,
  ) => {
    additionalResources.value = _additionalResources;
    openKaiExtensionPanel("additional_resources");
  };

  return {
    isExtensionPanelOpen,
    closeKaiExtensionPanel,
    panelMode,
    toggleNodeDescription,
    openAdditionalResources,
    additionalResources,
    selectedNodeTemplate,
  };
};
