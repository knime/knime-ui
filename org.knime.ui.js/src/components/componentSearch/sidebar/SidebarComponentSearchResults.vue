<script setup lang="ts">
import { useTemplateRef } from "vue";
import { storeToRefs } from "pinia";

import { type NavReachedEvent, NodeTemplate } from "@/components/nodeTemplates";
import type { ComponentNodeTemplateWithExtendedPorts } from "@/lib/data-mappers";
import { useAnalytics } from "@/services/analytics";
import { useSidebarComponentSearchStore } from "@/store/componentSearch";
import { usePanelStore } from "@/store/panel";
import ComponentSearchResults from "../ComponentSearchResults.vue";

type Props = {
  active: boolean;
};
defineProps<Props>();

const emit = defineEmits<{
  navReachedTop: [event: NavReachedEvent];
}>();

const componentSearchStore = useSidebarComponentSearchStore();
const { isLoading, hasLoaded, results } = storeToRefs(componentSearchStore);
const panelStore = usePanelStore();

const componentSearchResultsRef = useTemplateRef("componentSearchResultsRef");
const focusFirst = () => componentSearchResultsRef.value?.focusFirst();
defineExpose({ focusFirst });

const onShowComponentDetails = (
  node: ComponentNodeTemplateWithExtendedPorts,
) => {
  const isDescriptionActive =
    componentSearchStore.activeDescription?.id === node.id;

  if (!isDescriptionActive || !panelStore.isExtensionPanelOpen) {
    panelStore.openExtensionPanel();
    componentSearchStore.activeDescription = node;
    return;
  }

  panelStore.closeExtensionPanel();
};

const trackComponentInsertion = (
  action: "dblclick" | "enter" | "dragdrop",
  data: { template: ComponentNodeTemplateWithExtendedPorts },
) => {
  const trackId = (
    {
      dblclick: "node_created::noderepo_doubleclick_",
      enter: "node_created::noderepo_keyboard_enter",
      dragdrop: "node_created::noderepo_dragdrop_",
    } as const
  )[action];

  useAnalytics().track({
    id: trackId,
    payload: { nodeType: "component", nodeHubId: data.template.id },
  });
};
</script>

<template>
  <ComponentSearchResults
    ref="componentSearchResultsRef"
    :active="active"
    :is-loading="isLoading"
    :has-loaded="hasLoaded"
    :results="results"
    :fetch-data="componentSearchStore.searchComponents"
    @nav-reached-top="emit('navReachedTop', $event)"
    @show-component-details="onShowComponentDetails"
    @on-enter-key="trackComponentInsertion('enter', { template: $event })"
  >
    <template #nodesTemplate="slotProps">
      <NodeTemplate
        v-bind="slotProps"
        @toggle-details="
          onShowComponentDetails(
            slotProps.nodeTemplate as ComponentNodeTemplateWithExtendedPorts,
          )
        "
        @dbl-click-insert-component="
          trackComponentInsertion('dblclick', $event)
        "
        @drag-drop-insert-component="
          trackComponentInsertion('dragdrop', $event)
        "
      />
    </template>
  </ComponentSearchResults>
</template>

<style lang="postcss" scoped>
.empty-state {
  display: flex;
  justify-content: center;
  padding: var(--space-32) var(--space-8);
  font-size: 13px;
  text-align: center;
}
</style>
