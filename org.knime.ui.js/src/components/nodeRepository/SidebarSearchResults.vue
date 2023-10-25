<script>
import { mapState, mapActions } from "vuex";

import SearchResults from "@/components/nodeRepository/SearchResults.vue";
import DraggableNodeTemplate from "@/components/nodeRepository/DraggableNodeTemplate.vue";

/**
 * Search results that use nodeRepository store and the draggable node template (which also uses the store)
 */
export default {
  components: {
    DraggableNodeTemplate,
    SearchResults,
  },
  emits: ["showNodeDescription"],
  computed: {
    ...mapState("nodeRepository", [
      "topNodes",
      "bottomNodes",
      "query",
      "selectedTags",
      "selectedNode",
      "isShowingBottomNodes",
    ]),
    ...mapState("application", ["hasNodeCollectionActive"]),

    searchScrollPosition: {
      get() {
        return this.$store.state.nodeRepository.searchScrollPosition;
      },
      set(value) {
        this.$store.commit("nodeRepository/setSearchScrollPosition", value);
      },
    },
    searchActions() {
      return {
        searchTopNodesNextPage: this.searchTopNodesNextPage,
        searchBottomNodesNextPage: this.searchBottomNodesNextPage,
        toggleShowingBottomNodes: this.toggleShowingBottomNodes,
      };
    },
  },
  methods: {
    ...mapActions("nodeRepository", [
      "searchTopNodesNextPage",
      "searchBottomNodesNextPage",
      "toggleShowingBottomNodes",
    ]),
  },
};
</script>

<template>
  <SearchResults
    ref="searchResults"
    v-model:search-scroll-position="searchScrollPosition"
    :selected-node="selectedNode"
    :search-actions="searchActions"
    :is-showing-bottom-nodes="isShowingBottomNodes"
    :selected-tags="selectedTags"
    :query="query"
    :bottom-nodes="bottomNodes"
    :top-nodes="topNodes"
    :has-node-collection-active="hasNodeCollectionActive"
  >
    <template #nodesTemplate="slotProps">
      <DraggableNodeTemplate
        v-bind="slotProps"
        @show-node-description="$emit('showNodeDescription', slotProps)"
      />
    </template>
  </SearchResults>
</template>
