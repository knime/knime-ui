<!-- eslint-disable no-undefined -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";

import SearchResults from "@/components/nodeSearch/SearchResults.vue";
import {
  type NavReachedEvent,
  NodeTemplate,
  useAddNodeTemplateWithAutoPositioning,
} from "@/components/nodeTemplates";
import type { NodeTemplateWithExtendedPorts } from "@/lib/data-mappers";
import { useNodeRepositoryStore } from "@/store/nodeRepository";
import type { NodeRepositoryDisplayModesType } from "@/store/settings";
import { trackNodeCreation } from "../trackNodeCreation";
/**
 * Search results that use nodeRepository store and the draggable node template (which also uses the store)
 */

type Props = {
  displayMode?: NodeRepositoryDisplayModesType;
};

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

const { addNodeWithAutoPositioning } = useAddNodeTemplateWithAutoPositioning();

const searchActions = {
  searchNodesNextPage: () => nodeRepositoryStore.searchNodesNextPage(),
};

const searchResults = ref<InstanceType<typeof SearchResults>>();

const focusFirst = () => {
  searchResults.value?.focusFirst();
};

const onShowNodeDetails = (node: NodeTemplateWithExtendedPorts) => {
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

const addNodeOnEnterKey = async (
  nodeTemplate: NodeTemplateWithExtendedPorts,
) => {
  if (!nodeTemplate.nodeFactory) {
    return;
  }

  const { newNodeId, connectedTo } = await addNodeWithAutoPositioning(
    nodeTemplate.nodeFactory,
  );

  if (!newNodeId) {
    return;
  }

  trackNodeCreation("enter", {
    newNodeId,
    connectedTo,
    template: nodeTemplate,
  });
};
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
    @item-enter-key="addNodeOnEnterKey"
    @show-node-details="onShowNodeDetails"
    @nav-reached-top="$emit('navReachedTop', $event)"
  >
    <template #nodesTemplate="slotProps">
      <NodeTemplate
        v-bind="slotProps"
        @toggle-details="$emit('showNodeDescription', slotProps)"
        @dbl-click-insert-node="trackNodeCreation('dblclick', $event)"
        @drag-drop-insert-node="trackNodeCreation('dragdrop', $event)"
      />
    </template>
  </SearchResults>
</template>
