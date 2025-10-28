<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import SkeletonNodes from "@/components/common/skeleton-loader/SkeletonNodes.vue";
import type { HubComponent } from "@/store/hubComponents";
import { useHubComponentsStore } from "@/store/hubComponents";

import CategoryResults from "./CategoryResults.vue";

const store = useHubComponentsStore();
const { groupedByCategory, isLoading } = storeToRefs(store);

const displayMode = defineModel<"icon" | "list">("displayMode", {
  required: true,
});

withDefaults(
  defineProps<{
    selectedComponentId?: string | null;
    descriptionActiveForId?: string | null;
  }>(),
  {
    selectedComponentId: null,
    descriptionActiveForId: null,
  },
);

const emit = defineEmits<{
  selectComponent: [componentId: string];
  showNodeDescription: [component: HubComponent];
}>();

const hasResults = computed(() => groupedByCategory.value.length > 0);

const handleToggleExpansion = (category: string) => {
  store.toggleCategoryExpansion(category);
};

const isCategoryExpanded = (category: string) => {
  return store.isCategoryExpanded(category);
};
</script>

<template>
  <div v-if="isLoading" class="loading-state">
    <SkeletonNodes :number-of-nodes="18" :display-mode="displayMode" />
  </div>
  <div v-else-if="!hasResults" class="empty-state">
    No components found
  </div>
  <div v-else class="hub-components-grouped">
    <CategoryResults
      v-for="categoryGroup in groupedByCategory"
      :key="categoryGroup.category"
      :category="categoryGroup.category"
      :components="categoryGroup.components"
      :display-mode="displayMode"
      :is-expanded="isCategoryExpanded(categoryGroup.category)"
      :selected-component-id="selectedComponentId"
      :description-active-for-id="descriptionActiveForId"
      @select-component="emit('selectComponent', $event)"
      @show-node-description="emit('showNodeDescription', $event)"
      @toggle-expansion="handleToggleExpansion"
    />
  </div>
</template>

<style scoped>
.hub-components-grouped {
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  scrollbar-gutter: stable;
  padding: 0 0 var(--sidebar-panel-padding);
}

.loading-state,
.empty-state {
  padding: 16px;
  text-align: center;
  color: var(--knime-dove-gray);
}
</style>
