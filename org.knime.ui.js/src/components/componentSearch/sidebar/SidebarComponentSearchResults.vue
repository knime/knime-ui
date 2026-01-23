<script setup lang="ts">
import { useTemplateRef } from "vue";
import { storeToRefs } from "pinia";

import { type NavReachedEvent } from "@/components/nodeTemplates";
import { useSidebarComponentSearchStore } from "@/store/componentSearch";
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

const componentSearchResultsRef = useTemplateRef("componentSearchResultsRef");
const focusFirst = () => componentSearchResultsRef.value?.focusFirst();
defineExpose({ focusFirst });
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
