<script>
import { mapState, mapGetters } from 'vuex';

import NodeRepositoryCategory from '~/components/noderepo/NodeRepositoryCategory';
import NodeSearcher from '~/components/noderepo/NodeSearcher';
import ScrollViewContainer from '~/components/noderepo/ScrollViewContainer';
import ActionBreadcrumb from '~/components/common/ActionBreadcrumb';
import CloseableTagList from '~/components/noderepo/CloseableTagList';

import { debounce } from 'lodash';

const SEARCH_DEBOUNCE_WAIT = 100; // ms

export default {
    components: {
        CloseableTagList,
        ActionBreadcrumb,
        NodeRepositoryCategory,
        NodeSearcher,
        ScrollViewContainer
    },
    computed: {
        ...mapState('nodeRepository', ['nodes', 'tags', 'nodesPerCategory', 'query', 'scrollPosition',
            'isLoadingSearchResults']),
        ...mapGetters('nodeRepository', [
            'hasSearchParams'
        ]),

        /* Search and Filter */
        selectedTags: {
            get() {
                return this.$store.state.nodeRepository.selectedTags;
            },
            set(value) {
                this.$store.dispatch('nodeRepository/setSelectedTags', value);
            }
        },
        hasNoSearchResults() {
            return this.showSearchResults && this.nodes.length === 0;
        },
        showSearchResults() {
            return this.hasSearchParams && !this.isLoadingSearchResults;
        },

        /* Appearance */
        breadcrumbItems() {
            // If search results are shown, it's possible to navigate back
            return this.showSearchResults
                ? [{ text: 'Repository', id: 'clear' }, { text: 'Results' }]
                : [{ text: 'Repository' }];
        },
        categoriesDisplayed() {
            // Display either linear search results or nodes grouped by category
            return this.showSearchResults
                ? [{ nodes: this.nodes }]
                : this.nodesPerCategory;
        }
    },
    mounted() {
        if (!this.nodesPerCategory.length) {
            this.$store.dispatch('nodeRepository/getAllNodes', false);
        }
    },
    methods: {
        /* Search and Filter */
        updateSearchQuery: debounce(function (value) {
            // eslint-disable-next-line no-invalid-this
            this.$store.dispatch('nodeRepository/updateQuery', value);
        }, SEARCH_DEBOUNCE_WAIT, { trailing: true }),

        /* Grouped by Category */
        loadMoreResults() {
            if (!this.showSearchResults) {
                this.$store.dispatch('nodeRepository/getAllNodes', true);
            }
        },

        /* Navigation */
        onBreadcrumbClick(e) {
            if (e.id === 'clear') {
                this.$store.dispatch('nodeRepository/clearSearchParams');
            }
        },

        // TODO: NXT-844 why do we save the scroll position instead of using keep-alive for the repo?
        // Also currently the NodeRepository isn't destroyed upon closing
        updateScrollPosition(position) {
            this.$store.commit('nodeRepository/setScrollPosition', position);
        }
    }
};
</script>

<template>
  <div class="repo">
    <div class="header">
      <div class="title-and-search">
        <ActionBreadcrumb
          :items="breadcrumbItems"
          class="repo-breadcrumb"
          @click="onBreadcrumbClick"
        />
        <hr>
        <NodeSearcher
          :value="query"
          @input="updateSearchQuery"
        />
      </div>
      <CloseableTagList
        v-if="showSearchResults"
        v-model="selectedTags"
        :tags="tags"
      />
      <hr class="force">
    </div>
    <ScrollViewContainer
      :initial-position="scrollPosition"
      @scroll-bottom="loadMoreResults"
      @save-position="updateScrollPosition"
    >
      <div
        v-if="hasNoSearchResults"
        class="no-matching-search repo-content"
      >
        No node or component matching for: {{ query }}
      </div>
      <div
        v-else
        class="content"
      >
        <template v-for="(category, index) in categoriesDisplayed">
          <NodeRepositoryCategory
            :key="`tag-${index}`"
            :category="category"
          />
          <hr
            :key="index"
            class="full"
          >
        </template>
      </div>
    </ScrollViewContainer>
  </div>
</template>

<style lang="postcss" scoped>
.repo {
  font-family: "Roboto Condensed", sans-serif;
  height: 100%;
  display: flex;
  flex-direction: column;
  user-select: none;

  & .no-matching-search {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    height: 100%;
  }

  & .repo-breadcrumb {
    font-family: "Roboto Condensed", sans-serif;
    cursor: pointer;
    font-size: 18px;
    font-weight: 400;
    margin: 8px 0 0;

    & >>> span,
    & >>> a {
      line-height: 36px;
      padding: 0;
    }

    & >>> svg.arrow {
      margin-top: 6px;
    }
  }

  & hr {
    border: none;
    border-top: 1px solid var(--knime-silver-sand);
    margin: 0;

    &.full {
      width: 360px;
      margin-left: -20px;
      margin-bottom: 14px;
    }
  }

  & .closeable-tags {
    padding-top: 8px;
  }

  & .title-and-search {
    padding: 0 20px 5px;

    & > hr {
      margin-bottom: 13px;
      margin-top: 5px;
    }
  }

  & .header {
    position: sticky;
    background: var(--knime-gray-ultra-light);
    z-index: 2;
    top: 0;

    & > hr {
      margin-top: 8px;
    }
  }

  & hr:not(.force):last-child {
    display: none;
  }

  & .content {
    padding: 0 20px 15px;
  }
}
</style>
