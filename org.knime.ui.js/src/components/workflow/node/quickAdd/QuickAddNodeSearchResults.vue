<script lang="ts">
import { defineComponent, type PropType } from "vue";
import { mapActions, mapState } from "vuex";

import NodeTemplate from "@/components/nodeRepository/NodeTemplate.vue";
import SearchResults from "@/components/nodeRepository/SearchResults.vue";
import type { KnimeNode } from "@/api/custom-types";

export default defineComponent({
  components: {
    SearchResults,
    NodeTemplate,
  },
  props: {
    selectedNode: {
      type: [Object, null] as PropType<KnimeNode | null>,
      required: true,
    },
  },
  emits: ["update:selectedNode", "addNode"],
  expose: ["focusFirst"],
  computed: {
    ...mapState("application", ["hasNodeCollectionActive"]),
    ...mapState("quickAddNodes", ["starterNodes", "allNodes", "query"]),

    searchActions() {
      return {
        searchTopNodesNextPage: this.searchTopNodesNextPage,
        searchBottomNodesNextPage: this.searchBottomNodesNextPage,
        toggleShowingBottomNodes: this.toggleShowingBottomNodes,
      };
    },
  },
  methods: {
    ...mapActions("quickAddNodes", [
      "searchTopNodesNextPage",
      "searchBottomNodesNextPage",
      "toggleShowingBottomNodes",
    ]),
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
    :all-nodes="allNodes"
    :has-node-collection-active="hasNodeCollectionActive"
    :query="query"
    :search-actions="searchActions"
    :highlight-first="true"
    :selected-node="selectedNode"
    :starter-nodes="starterNodes"
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
