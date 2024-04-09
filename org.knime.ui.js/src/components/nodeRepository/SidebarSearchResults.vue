<script lang="ts">
import { defineComponent, type PropType } from "vue";
import { mapState, mapActions } from "vuex";

import SearchResults from "@/components/nodeRepository/SearchResults.vue";
import DraggableNodeTemplate from "@/components/nodeRepository/DraggableNodeTemplate.vue";
import type { NodeRepositoryDisplayModesType } from "@/store/settings";

/**
 * Search results that use nodeRepository store and the draggable node template (which also uses the store)
 */
export default defineComponent({
  components: {
    DraggableNodeTemplate,
    SearchResults,
  },
  props: {
    displayMode: {
      type: String as PropType<NodeRepositoryDisplayModesType>,
      default: "icon",
    },
  },
  emits: ["showNodeDescription"],
  computed: {
    ...mapState("nodeRepository", [
      "nodes",
      "query",
      "selectedTags",
      "selectedNode",
      "totalNumFilteredNodesFound",
    ]),

    searchScrollPosition: {
      get() {
        return this.$store.state.nodeRepository.searchScrollPosition;
      },
      set(value: number) {
        this.$store.commit("nodeRepository/setSearchScrollPosition", value);
      },
    },
    searchActions() {
      return {
        searchNodesNextPage: this.searchNodesNextPage,
      };
    },
  },
  methods: {
    ...mapActions("nodeRepository", ["searchNodesNextPage"]),
  },
});
</script>

<template>
  <SearchResults
    ref="searchResults"
    v-model:search-scroll-position="searchScrollPosition"
    :selected-node="selectedNode"
    :search-actions="searchActions"
    :selected-tags="selectedTags"
    :display-mode="displayMode"
    :query="query"
    :nodes="nodes"
    :num-filtered-out-nodes="totalNumFilteredNodesFound"
    :show-download-button="
      $store.state.application.permissions.showFloatingDownloadButton
    "
  >
    <template #nodesTemplate="slotProps">
      <DraggableNodeTemplate
        v-bind="slotProps"
        @show-node-description="$emit('showNodeDescription', slotProps)"
      />
    </template>
  </SearchResults>
</template>
