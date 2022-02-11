<script>
import { mapState } from 'vuex';
import ReloadIcon from '~/webapps-common/ui/assets/img/icons/reload.svg?inline';
import ScrollViewContainer from './ScrollViewContainer.vue';
import NodeList from './NodeList.vue';

export default {
    components: {
        ScrollViewContainer,
        NodeList,
        ReloadIcon
    },
    computed: {
        ...mapState('nodeRepository', ['nodes', 'query', 'scrollPosition', 'totalNumNodes', 'lazyLoading']),
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
            this.$store.commit('nodeRepository/setLazyLoading', true);
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
    No node matching for: {{ query }}
  </div>
  <ScrollViewContainer
    v-else
    class="results"
    :initial-position="scrollPosition"
    @save-position="updateScrollPosition"
    @scroll-bottom="loadMoreSearchResults"
  >
    <div class="content">
      <NodeList
        :nodes="nodes"
      />
    </div>
    <ReloadIcon
      v-if="lazyLoading"
      class="loading"
    />
  </ScrollViewContainer>
</template>

<style lang="postcss" scoped>
@keyframes spin {
  100% {
    transform: rotate(-360deg);
  }
}

.no-matching-search {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  height: 100%;
}

.results {
  display: flex;
  flex-direction: column;
  align-items: center;

  & .content {
    padding: 0 20px 15px;
  }

  & .loading {
    animation: spin 2s linear infinite;
    width: 40px;
    height: 40px;
    stroke-width: calc(32px / 24);
    stroke: var(--knime-masala);
  }
}
</style>
