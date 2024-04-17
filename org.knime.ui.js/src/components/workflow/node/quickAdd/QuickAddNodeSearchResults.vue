<script lang="ts">
import { defineComponent, type PropType } from "vue";
import { mapActions, mapState } from "vuex";

import NodeTemplate from "@/components/nodeRepository/NodeTemplate/NodeTemplate.vue";
import SearchResults from "@/components/nodeRepository/SearchResults.vue";
import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";
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
  expose: ["focusFirst"],
  computed: {
    ...mapState("quickAddNodes", [
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
    ...mapActions("quickAddNodes", ["searchNodesNextPage"]),
    focusFirst() {
      // @ts-ignore
      return this.$refs.searchResults?.focusFirst();
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
    :show-download-button="
      $store.state.application.permissions.showFloatingDownloadButton
    "
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
