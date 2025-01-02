<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";

import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";
import DraggableNodeTemplate from "@/components/nodeRepository/DraggableNodeTemplate.vue";
import SearchResults from "@/components/nodeRepository/SearchResults.vue";
import { useNodeRepositoryStore } from "@/store/nodeRepository";
import type { NodeRepositoryDisplayModesType } from "@/store/settings";

import type { NavReachedEvent } from "./NodeList.vue";
import { useAddNodeToWorkflow } from "./useAddNodeToWorkflow";
/**
 * Search results that use nodeRepository store and the draggable node template (which also uses the store)
 */

interface Props {
  displayMode: NodeRepositoryDisplayModesType;
}

const props = withDefaults(defineProps<Props>(), {
  displayMode: "icon",
});

const emit = defineEmits<{
  (
    e: "showNodeDescription",
    params: {
      isDescriptionActive: boolean;
      nodeTemplate: NodeTemplateWithExtendedPorts;
    },
  ): void;
  (e: "navReachedTop", event: NavReachedEvent): void;
}>();

const nodeRepositoryStore = useNodeRepositoryStore();
const {
  nodes,
  query,
  showDescriptionForNode,
  selectedTags,
  totalNumFilteredNodesFound,
  isLoadingSearchResults,
  searchScrollPosition,
  selectedNode,
} = storeToRefs(nodeRepositoryStore);

const addNodeToWorkflow = useAddNodeToWorkflow();

const searchActions = {
  searchNodesNextPage: () => nodeRepositoryStore.searchNodesNextPage(),
};

const searchResults = ref<InstanceType<typeof SearchResults>>();

const focusFirst = () => {
  searchResults.value?.focusFirst();
};

const onHelpKey = (node: NodeTemplateWithExtendedPorts) => {
  emit("showNodeDescription", {
    nodeTemplate: node,
    isDescriptionActive: showDescriptionForNode.value?.id === node.id,
  });
};

defineExpose({ focusFirst });

const displayModeSupported = computed(() => {
  if (props.displayMode === "tree") {
    return "list";
  }
  return props.displayMode;
});
</script>

<template>
  <SearchResults
    ref="searchResults"
    v-model:search-scroll-position="searchScrollPosition"
    v-model:selected-node="selectedNode"
    :search-actions="searchActions"
    :selected-tags="selectedTags"
    :show-description-for-node="showDescriptionForNode"
    :display-mode="displayModeSupported"
    :query="query"
    :nodes="nodes"
    :num-filtered-out-nodes="totalNumFilteredNodesFound"
    :is-loading-search-results="isLoadingSearchResults"
    @item-enter-key="addNodeToWorkflow({ nodeFactory: $event.nodeFactory! })"
    @help-key="onHelpKey"
    @nav-reached-top="$emit('navReachedTop', $event)"
  >
    <template #nodesTemplate="slotProps">
      <DraggableNodeTemplate
        v-bind="slotProps"
        @show-node-description="$emit('showNodeDescription', slotProps)"
      />
    </template>
  </SearchResults>
</template>
