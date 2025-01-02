<script lang="ts">
import { type PropType, defineComponent } from "vue";
import { mapActions, mapState } from "pinia";

import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";
import NodeTemplate from "@/components/nodeRepository/NodeTemplate/NodeTemplate.vue";
import SearchResults from "@/components/nodeRepository/SearchResults.vue";
import { useQuickAddNodesStore } from "@/store/quickAddNodes";
import type { NodeRepositoryDisplayModesType } from "@/store/settings";

export default defineComponent({
  components: {
    SearchResults,
    NodeTemplate,
  },
  props: {
    selectedNode: {
      type: [Object, null] as PropType<NodeTemplateWithExtendedPorts | null>,
      required: true,
    },
    displayMode: {
      type: String as PropType<NodeRepositoryDisplayModesType>,
      default: "icon",
    },
  },
  emits: ["update:selectedNode", "addNode"],
  // FIXME: why does this cause issues?
  // expose: ["focusFirst"],
  computed: {
    ...mapState(useQuickAddNodesStore, [
      "nodes",
      "query",
      "totalNumFilteredNodesFound",
      "isLoadingSearchResults",
    ]),

    searchActions() {
      return {
        searchNodesNextPage: this.searchNodesNextPage,
      };
    },
  },
  methods: {
    ...mapActions(useQuickAddNodesStore, ["searchNodesNextPage"]),
    focusFirst() {
      const searchResults = this.$refs.searchResults as InstanceType<
        typeof SearchResults
      >;
      return searchResults.focusFirst();
    },
  },
});
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
