<script lang="ts" setup>
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";

import SearchResults from "@/components/nodeSearch/SearchResults.vue";
import { NodeTemplate } from "@/components/nodeTemplates";
import { useQuickAddNodesStore } from "@/store/quickAddNodes";
import type { NodeRepositoryDisplayModesType } from "@/store/settings";
import type { NodeTemplateWithExtendedPorts } from "@/util/data-mappers";

type Props = {
  selectedNode: NodeTemplateWithExtendedPorts | null;
  displayMode?: Exclude<NodeRepositoryDisplayModesType, "tree">;
};

withDefaults(defineProps<Props>(), {
  displayMode: "icon",
});

defineEmits<{
  "update:selectedNode": [value: NodeTemplateWithExtendedPorts | null];
  addNode: [node: NodeTemplateWithExtendedPorts];
}>();

const quickAddNodesStore = useQuickAddNodesStore();

const { nodes, query, totalNumFilteredNodesFound, isLoadingSearchResults } =
  storeToRefs(quickAddNodesStore);

const searchActions = computed(() => ({
  searchNodesNextPage: quickAddNodesStore.searchNodesNextPage,
}));

const searchResults = ref<InstanceType<typeof SearchResults>>();
const focusFirst = () => searchResults.value?.focusFirst();
defineExpose({ focusFirst });
</script>

<template>
  <SearchResults
    ref="searchResults"
    :query="query"
    :search-actions="searchActions"
    :highlight-first="true"
    :selected-node="selectedNode"
    :display-mode="displayMode"
    :nodes="nodes"
    :num-filtered-out-nodes="totalNumFilteredNodesFound"
    :is-loading-search-results="isLoadingSearchResults"
    :is-quick-add-node-menu="true"
    @update:selected-node="$emit('update:selectedNode', $event)"
    @item-enter-key="$emit('addNode', $event)"
  >
    <template #nodesTemplate="itemProps">
      <NodeTemplate
        v-bind="itemProps"
        @click="$emit('addNode', itemProps.nodeTemplate)"
      />
    </template>
  </SearchResults>
</template>
