<script setup lang="ts">
import { useTemplateRef } from "vue";
import { storeToRefs } from "pinia";

import { type NavReachedEvent } from "@/components/nodeTemplates";
import { useSidebarComponentSearchStore } from "@/store/componentSearch";
import { usePanelStore } from "@/store/panel";
import type { ComponentNodeTemplateWithExtendedPorts } from "@/util/dataMappers";
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
  />
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
