<script>
import { mapState, mapActions, mapMutations } from 'vuex';

import ExpandTransition from 'webapps-common/ui/components/transitions/ExpandTransition.vue';
import BaseButton from 'webapps-common/ui/components/BaseButton.vue';
import DropdownIcon from 'webapps-common/ui/assets/img/icons/arrow-dropdown.svg';
import ReloadIcon from 'webapps-common/ui/assets/img/icons/reload.svg';
import ScrollViewContainer from './ScrollViewContainer.vue';
import NodeList from './NodeList.vue';

export default {
    components: {
        ScrollViewContainer,
        NodeList,
        ReloadIcon,
        ExpandTransition,
        BaseButton,
        DropdownIcon
    },
    data() {
        return {
            isLoading: false,
            isLoadingMore: false
        };
    },
    computed: {
        ...mapState('nodeRepository', [
            'nodes',
            'moreNodes',
            'query',
            'selectedTags',
            'searchScrollPosition',
            'totalNumNodes',
            'showingMoreNodes'
        ]),
        ...mapState('application', ['hasNodeCollectionActive']),
        hasNoSearchResults() {
            return this.nodes.length === 0;
        },
        hasNoMoreSearchResults() {
            // NB: If moreNodes is null the results are still loading
            return this.moreNodes !== null && this.moreNodes.length === 0;
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
        ...mapActions('nodeRepository', ['searchNodesNextPage', 'toggleShowingMoreNodes']),
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
  <ScrollViewContainer
    ref="scroller"
    class="results"
    :initial-position="searchScrollPosition"
    @save-position="onSaveScrollPosition"
    @scroll-bottom="loadMoreSearchResults"
  >
    <div class="content">
      <div
        v-if="hasNoSearchResults"
        class="no-matching-search"
      >
        No node matching for: {{ query }}
      </div>
      <div
        v-else
        class="nodes"
      >
        <NodeList :nodes="nodes" />
        <ReloadIcon
          v-if="isLoading"
          class="loading-indicator"
        />
      </div>
    </div>
    <div
      v-if="hasNodeCollectionActive"
      class="content"
    >
      <BaseButton
        class="more-nodes-button"
        :aria-expanded="String(showingMoreNodes)"
        @click.prevent="toggleShowingMoreNodes"
      >
        <div class="more-nodes-dropdown">
          <DropdownIcon :class="['dropdown-icon', {flip: showingMoreNodes}]" />
        </div>
        More advanced nodes
      </BaseButton>
      <ExpandTransition :is-expanded="showingMoreNodes">
        <div
          v-if="hasNoMoreSearchResults"
          class="no-matching-search"
        >
          No additional node matching for: {{ query }}
        </div>
        <div
          v-else
          class="nodes"
        >
          <NodeList :nodes="moreNodes" />
          <ReloadIcon
            v-if="isLoadingMore"
            class="loading-indicator"
          />
        </div>
      </ExpandTransition>
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
  color: var(--knime-dove-gray);
  flex-direction: column;
  margin-top: 30px;
  margin-bottom: 15px;
}

.results {
  & .content {
    padding: 0 20px 15px;

    & .nodes {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    & .loading-indicator {
      @mixin svg-icon-size 40;

      animation: spin 2s linear infinite;
      stroke: var(--knime-masala);
      align-self: center;
    }

    & .more-nodes-button {
      width: 100%;
      border: 0;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;

      & .more-nodes-dropdown {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;

        & .dropdown-icon {
          margin: auto;
          width: 18px;
          height: 18px;
          stroke-width: calc(32px / 18);
          stroke: var(--knime-masala);

          &.flip {
            transform: scaleY(-1);
          }
        }

        &:hover {
          background-color: var(--theme-button-function-background-color-hover);
        }
      }

      &::after,
      &::before {
        content: "";
        flex: 1 1;
        border-bottom: 1px solid var(--knime-silver-sand);
      }

      &::after {
        margin-left: 10px;
      }
    }
  }
}
</style>
