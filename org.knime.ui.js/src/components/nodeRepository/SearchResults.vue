<script>
import { mapState, mapActions, mapMutations } from 'vuex';

import ReloadIcon from 'webapps-common/ui/assets/img/icons/reload.svg';
import ScrollViewContainer from './ScrollViewContainer.vue';
import NodeList from './NodeList.vue';

export default {
    components: {
        ScrollViewContainer,
        NodeList,
        ReloadIcon
    },
    data() {
        return {
            isLoading: false
        };
    },
    computed: {
        ...mapState('nodeRepository', ['nodes', 'query', 'selectedTags', 'searchScrollPosition', 'totalNumNodes']),
        hasNoSearchResults() {
            return this.nodes.length === 0;
        }
    },
    watch: {
        query() {
            this.onSearchChanged();
        },
        selectedTags() {
            this.onSearchChanged();
        }
    },
    methods: {
        ...mapActions('nodeRepository', ['searchNodesNextPage']),
        ...mapMutations('nodeRepository', ['setSearchScrollPosition']),
        // Also currently the NodeRepository isn't destroyed upon closing
        onSaveScrollPosition(position) {
            this.setSearchScrollPosition(position);
        },
        async onSearchChanged() {
            let { scroller } = this.$refs;
          
            // wait for new content to be displayed, then scroll to top
            await this.$nextTick();
            if (scroller) {
                scroller.$el.scrollTop = 0;
            }
        },
        async loadMoreSearchResults() {
            this.isLoading = true;
            await this.searchNodesNextPage(true);
            this.isLoading = false;
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
    ref="scroller"
    class="results"
    :initial-position="searchScrollPosition"
    @save-position="onSaveScrollPosition"
    @scroll-bottom="loadMoreSearchResults"
  >
    <div class="content">
      <NodeList
        :nodes="nodes"
      />
      <ReloadIcon
        v-if="isLoading"
        class="loading-indicator"
      />
    </div>
  </ScrollViewContainer>
</template>

<style lang="postcss" scoped>
@import "@/assets/mixins.css";

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
  font-style: italic;
  margin-bottom: 110px; /* align text according to NodeDescription empty text when no node is selected */
  color: var(--knime-dove-gray);
}

.results {
  & .content {
    padding: 0 20px 15px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;

    & .loading-indicator {
      @mixin svg-icon 40;
      animation: spin 2s linear infinite;
      stroke: var(--knime-masala);
      align-self: center;
    }
  }
}
</style>
