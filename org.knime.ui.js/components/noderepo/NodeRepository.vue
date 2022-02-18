<script>
import { mapState, mapGetters, mapActions } from 'vuex';

import ActionBreadcrumb from '~/components/common/ActionBreadcrumb';
import SearchBar from '~/components/noderepo/SearchBar';
import CloseableTagList from '~/components/noderepo/CloseableTagList';
import CategoryResults from '~/components/noderepo/CategoryResults.vue';
import SearchResults from '~/components/noderepo/SearchResults.vue';

import { debounce } from 'lodash';

const SEARCH_COOLDOWN = 150; // ms

export default {
    components: {
        CloseableTagList,
        ActionBreadcrumb,
        SearchBar,
        CategoryResults,
        SearchResults
    },
    computed: {
        ...mapState('nodeRepository', ['tags', 'nodes', 'nodesPerCategory']),
        ...mapGetters('nodeRepository', ['hasSearchParams']),

        /* Search and Filter */
        selectedTags: {
            get() { return this.$store.state.nodeRepository.selectedTags; },
            set(value) {
                this.$store.dispatch('nodeRepository/setSelectedTags', value);
            }
        },
        searchQuery: {
            get() { return this.$store.state.nodeRepository.query; },
            set: debounce(function (value) {
                this.$store.dispatch('nodeRepository/updateQuery', value); // eslint-disable-line no-invalid-this
            },
            SEARCH_COOLDOWN, { leading: true, trailing: true })
        },
        
        showSearchResults() {
            return Boolean(this.searchQuery || this.selectedTags.length) && this.nodes !== null;
        },

        /* Navigation */
        breadcrumbItems() {
            // If search results are shown, it's possible to navigate back
            return this.showSearchResults
                ? [{ text: 'Repository', id: 'clear' }, { text: 'Results' }]
                : [{ text: 'Repository' }];
        }
    },
    mounted() {
        if (!this.nodesPerCategory.length) {
            this.$store.dispatch('nodeRepository/getAllNodes', false);
        }
    },
    methods: {
        ...mapActions('panel', ['closeDescriptionPanel']),
        /* Navigation */
        onBreadcrumbClick(e) {
            this.closeDescriptionPanel();
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
        <SearchBar v-model="searchQuery" />
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


</style>
