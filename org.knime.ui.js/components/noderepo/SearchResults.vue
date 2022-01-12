<script>
import { mapState } from 'vuex';
import ScrollViewContainer from './ScrollViewContainer.vue';
import NodeList from './NodeList.vue';

export default {
    components: {
        ScrollViewContainer,
        NodeList
    },
    computed: {
        ...mapState('nodeRepository', ['nodes', 'query', 'scrollPosition', 'totalNumNodes']),
        hasNoSearchResults() {
            return this.nodes.length === 0;
        }
    },
    methods: {
        // TODO: NXT-844 why do we save the scroll position instead of using keep-alive for the repo?
        // Also currently the NodeRepository isn't destroyed upon closing
        updateScrollPosition(position) {
            this.$store.commit('nodeRepository/setScrollPosition', position);
        },
        loadMoreSearchResults() {
            this.$store.dispatch('nodeRepository/searchNodesNextPage', true);
        }
    }
};
</script>

<template>
  <div
    v-if="hasNoSearchResults"
    class="no-matching-search"
  >
    No node or component matching for: {{ query }}
  </div>
  <ScrollViewContainer
    v-else
    class="results"
    :initial-position="scrollPosition"
    @save-position="updateScrollPosition"
  >
    <div class="content">
      <NodeList
        :nodes="nodes"
        :has-more-nodes="nodes.length < totalNumNodes"
        @show-more="loadMoreSearchResults"
      >
        <template #more-button>Show more…</template>
      </NodeList>
    </div>
  </ScrollViewContainer>
</template>

<style lang="postcss" scoped>
.no-matching-search {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  height: 100%;
}

.results {
  & .content {
    padding: 0 20px 15px;
  }
}
</style>
