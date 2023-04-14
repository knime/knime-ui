<script>
import { mapState, mapGetters, mapMutations } from 'vuex';

import ActionBreadcrumb from '@/components/common/ActionBreadcrumb.vue';
import SearchBar from '@/components/common/SearchBar.vue';
import CloseableTagList from './CloseableTagList.vue';
import CategoryResults from './CategoryResults.vue';
import NodeDescriptionOverlay from './NodeDescriptionOverlay.vue';
import SidebarSearchResults from '@/components/nodeRepository/SidebarSearchResults.vue';

const DESELECT_NODE_DELAY = 50; // ms - keep in sync with extension panel transition in Sidebar.vue

export default {
    components: {
        SidebarSearchResults,
        CloseableTagList,
        ActionBreadcrumb,
        SearchBar,
        CategoryResults,
        NodeDescriptionOverlay
    },
    data() {
        return {
            // we keep the query local to debounce the update in the store, see watcher
            searchQuery: ''
        };
    },
    computed: {
        ...mapState('nodeRepository', ['topNodes', 'nodesPerCategory', 'isDescriptionPanelOpen', 'selectedNode']),
        ...mapGetters('nodeRepository', {
            showSearchResults: 'searchIsActive',
            isSelectedNodeVisible: 'isSelectedNodeVisible',
            tags: 'tagsOfVisibleNodes'
        }),

        /* Search and Filter */
        selectedTags: {
            get() {
                return this.$store.state.nodeRepository.selectedTags;
            },
            set(value) {
                this.$store.dispatch('nodeRepository/setSelectedTags', value);
            }
        },

        /* Navigation */
        breadcrumbItems() {
            // If search results are shown, it's possible to navigate back
            return this.showSearchResults
                ? [{ text: 'Repository', id: 'clear' }, { text: 'Results' }]
                : [{ text: 'Repository' }];
        }
    },
    watch: {
        // deselect node on panel close
        isDescriptionPanelOpen(val) {
            if (val === false) {
                setTimeout(() => {
                    this.setSelectedNode(null);
                }, DESELECT_NODE_DELAY);
            }
        },
        searchQuery(value) {
            this.$store.dispatch('nodeRepository/updateQuery', value);
        }
    },
    mounted() {
        if (!this.nodesPerCategory.length) {
            this.$store.dispatch('nodeRepository/getAllNodes', { append: false });
        }
    },
    methods: {
        ...mapMutations('nodeRepository', ['setSelectedNode']),
        /* Navigation */
        onBreadcrumbClick(e) {
            if (e.id === 'clear') {
                this.clearSearchParams();
            }
        },
        async clearSearchParams() {
            this.searchQuery = '';
            await this.$store.dispatch('nodeRepository/clearSearchParams');
        }
    }
};
</script>

<template>
  <div class="node-repo">
    <div class="header">
      <div class="title-and-search">
        <ActionBreadcrumb
          :items="breadcrumbItems"
          class="repo-breadcrumb"
          @click="onBreadcrumbClick"
        />
        <hr>
        <SearchBar
          v-model="searchQuery"
          placeholder="Search Nodes"
          class="search-bar"
        />
      </div>
      <CloseableTagList
        v-if="showSearchResults && tags.length"
        v-model="selectedTags"
        :tags="tags"
      />
      <hr v-if="!topNodes || tags.length">
    </div>
    <SidebarSearchResults
      v-if="showSearchResults"
      ref="searchResults"
    />
    <CategoryResults v-else />
    <Portal to="extension-panel">
      <Transition name="extension-panel">
        <NodeDescriptionOverlay
          v-if="isDescriptionPanelOpen"
          :selected-node="isSelectedNodeVisible ? selectedNode : null"
        />
      </Transition>
    </Portal>
  </div>
</template>

<style lang="postcss" scoped>
.node-repo {
  font-family: "Roboto Condensed", sans-serif;
  height: 100%;
  display: flex;
  flex-direction: column;
  user-select: none;

  & hr {
    border: none;
    border-top: 1px solid var(--knime-silver-sand);
    margin: 0;
  }
}

.header {
  position: sticky;
  background: var(--knime-porcelain);
  z-index: 2;
  top: 0;

  & > hr {
    margin-top: 8px;
  }

  & .title-and-search {
    padding: 0 20px 5px;

    & > hr {
      margin-bottom: 13px;
      margin-top: 5px;
    }
  }

  & .repo-breadcrumb {
    font-family: "Roboto Condensed", sans-serif;
    cursor: pointer;
    font-size: 18px;
    font-weight: 400;
    margin: 8px 0 0;

    & :deep(span),
    & :deep(a) {
      line-height: 36px;
      padding: 0;
    }

    & :deep(svg.arrow) {
      margin-top: 6px;
    }
  }
}

.search-bar {
  height: 40px;
  font-size: 17px;

  &:hover {
    background-color: var(--knime-silver-sand-semi);
  }

  &:focus-within {
    background-color: var(--knime-white);
    border-color: var(--knime-masala);
  }
}

.extension-panel-enter-active {
  transition: all 50ms ease-in;
}

.extension-panel-leave-active {
  transition: all 50ms ease-out;
}

.extension-panel-enter-from,
.extension-panel-leave-to {
  opacity: 0;
}

</style>
