<script>
import { mapState, mapGetters, mapMutations } from 'vuex';

import ActionBreadcrumb from '~/components/common/ActionBreadcrumb';
import SearchBar from '~/components/noderepo/SearchBar';
import CloseableTagList from '~/components/noderepo/CloseableTagList';
import CategoryResults from '~/components/noderepo/CategoryResults';
import SearchResults from '~/components/noderepo/SearchResults';
import NodeDescription from '~/components/noderepo/NodeDescription';

import { debounce } from 'lodash';

const SEARCH_COOLDOWN = 150; // ms
const DESELECT_NODE_DELAY = 50; // ms - keep in sync with extension panel transition in SideMenu

export default {
    components: {
        CloseableTagList,
        ActionBreadcrumb,
        SearchBar,
        CategoryResults,
        NodeDescription,
        SearchResults
    },
    computed: {
        ...mapState('nodeRepository', ['tags', 'nodes', 'nodesPerCategory', 'isDescriptionPanelOpen']),
        ...mapGetters('nodeRepository', { showSearchResults: 'searchIsActive' }),

        /* Search and Filter */
        selectedTags: {
            get() {
                return this.$store.state.nodeRepository.selectedTags;
            },
            set(value) {
                this.$store.dispatch('nodeRepository/setSelectedTags', value);
            }
        },
        searchQuery: {
            get() {
                return this.$store.state.nodeRepository.query;
            },
            set: debounce(function (value) {
                this.$store.dispatch('nodeRepository/updateQuery', value); // eslint-disable-line no-invalid-this
            },
            SEARCH_COOLDOWN, { leading: true, trailing: true })
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
                this.$store.dispatch('nodeRepository/clearSearchParams');
            }
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
        v-if="showSearchResults"
        v-model="selectedTags"
        :tags="tags"
      />
      <hr v-if="!nodes || nodes.length">
    </div>
    <SearchResults v-if="showSearchResults" />
    <CategoryResults v-else />
    <portal to="extension-panel">
      <NodeDescription v-if="isDescriptionPanelOpen" />
    </portal>
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
  background: var(--knime-gray-ultra-light);
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

    & >>> span,
    & >>> a {
      line-height: 36px;
      padding: 0;
    }

    & >>> svg.arrow {
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


</style>
