<script setup lang="ts">
import { computed, ref } from "vue";
import { useStore } from "@/composables/useStore";
import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";
import type { NodeRepositoryDisplayModesType } from "@/store/settings";
import SearchResults from "@/components/nodeRepository/SearchResults.vue";
import DraggableNodeTemplate from "@/components/nodeRepository/DraggableNodeTemplate.vue";
import { useAddNodeToWorkflow } from "./useAddNodeToWorkflow";
import type { NavReachedEvent } from "./NodeList.vue";
/**
 * Search results that use nodeRepository store and the draggable node template (which also uses the store)
 */

interface Props {
  displayMode: NodeRepositoryDisplayModesType;
}

withDefaults(defineProps<Props>(), {
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

const store = useStore();

const nodes = computed(() => store.state.nodeRepository.nodes);
const query = computed(() => store.state.nodeRepository.query);
const showDescriptionForNode = computed(
  () => store.state.nodeRepository.showDescriptionForNode,
);
const selectedTags = computed(() => store.state.nodeRepository.selectedTags);
const totalNumFilteredNodesFound = computed(
  () => store.state.nodeRepository.totalNumFilteredNodesFound,
);
const isLoadingSearchResults = computed(
  () => store.state.nodeRepository.isLoadingSearchResults,
);

const addNodeToWorkflow = useAddNodeToWorkflow();

const searchScrollPosition = computed({
  get() {
    return store.state.nodeRepository.searchScrollPosition;
  },
  set(value) {
    store.commit("nodeRepository/setSearchScrollPosition", value);
  },
});
const selectedNode = computed({
  get() {
    return store.state.nodeRepository.selectedNode;
  },
  set(value) {
    store.commit("nodeRepository/setSelectedNode", value);
  },
});

const searchActions = {
  searchNodesNextPage: () =>
    store.dispatch("nodeRepository/searchNodesNextPage"),
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
</script>

<template>
  <SearchResults
    ref="searchResults"
    v-model:search-scroll-position="searchScrollPosition"
    v-model:selected-node="selectedNode"
    :search-actions="searchActions"
    :selected-tags="selectedTags"
    :show-description-for-node="showDescriptionForNode"
    :display-mode="displayMode"
    :query="query"
    :nodes="nodes"
    :num-filtered-out-nodes="totalNumFilteredNodesFound"
    :show-download-button="
      $store.state.application.permissions.showFloatingDownloadButton
    "
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
