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
  props: {
    displayMode: {
      type: String,
      default: "icon",
    },
  },
  emits: ["showNodeDescription"],
  computed: {
    ...mapState("application", ["permissions"]),
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
      set(value) {
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
};
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
    :show-download-button="permissions.showDownloadAPButton"
  >
    <template #nodesTemplate="slotProps">
      <DraggableNodeTemplate
        v-bind="slotProps"
        @show-node-description="$emit('showNodeDescription', slotProps)"
      />
    </template>
  </SearchResults>
</template>
