<script>
import { mapState, mapGetters } from 'vuex';

import TagList from '~/webapps-common/ui/components/TagList';
import Button from '~/webapps-common/ui/components/Button';
import CloseIcon from '~/webapps-common/ui/assets/img/icons/close.svg?inline';
import NodeRepositoryCategory from '~/components/NodeRepositoryCategory';
import NodeSearcher from '~/components/NodeSearcher';
import ScrollViewContainer from '~/components/ScrollViewContainer';

export default {
    components: {
        TagList,
        Button,
        CloseIcon,
        NodeRepositoryCategory,
        NodeSearcher,
        ScrollViewContainer
    },
    computed: {
        ...mapState('nodeRepository', [
            'nodes',
            'selectedTags',
            'tags',
            'nodesPerCategory',
            'query'
        ]),
        ...mapGetters('nodeRepository', [
            'nodeSearching',
            'scrollPosition'
        ]),
        categoriesDisplayed() {
            if (this.nodeSearching) {
                const result = {
                    nodes: this.nodes
                };
                return [result];
            }
            return this.nodesPerCategory;
        }
    },
    mounted() {
        if (!this.nodesPerCategory.length) {
            this.$store.dispatch('nodeRepository/getAllNodes', false);
        }
    },
    methods: {
        loadMoreNodes() {
            this.$store.dispatch('nodeRepository/searchNodesNextPage');
        },
        selectTag(tag) {
            this.$store.dispatch('nodeRepository/selectTag', tag);
        },
        deselectTag(tag) {
            this.$store.dispatch('nodeRepository/deselectTag', tag);
        },
        clearSelectedTags() {
            this.$store.dispatch('nodeRepository/clearSelectedTags');
        },
        clearNodeSearching() {
            this.$store.dispatch('nodeRepository/updateQuery', '');
        },
        lazyLoadCategories() {
            if (this.selectedTags.length === 0) {
                this.$store.dispatch('nodeRepository/getAllNodes', true);
            }
        },
        updateScrollPosition(position) {
            this.$store.commit('nodeRepository/setScrollPosition', position);
        }
    }
};
</script>

<template>
  <ScrollViewContainer
    :initial-position="scrollPosition"
    @scroll-bottom="lazyLoadCategories"
    @save-position="updateScrollPosition"
  >
    <div class="repo">
      <h4
        @click="clearNodeSearching"
      >
        Repository
      </h4>
      <span class="break" />
      <NodeSearcher />
      <div
        v-if="nodeSearching && !nodes.length"
        class="no-matching-search"
      >
        No node or component matching for: {{ query }}
      </div>
      <div v-else>
        <template v-if="nodeSearching">
          <div class="tags">
            <TagList
              :tags="tags.filter((t) => !selectedTags.includes(t))"
              clickable
              @click="selectTag"
            />
          </div>
          <span class="break full" />
        </template>

        <div
          v-if="selectedTags.length"
          class="filter"
        >
          <div class="filter-tags">
            Filter
            <Button
              compact
              class="clear-button"
              @click="clearSelectedTags"
            >
              Clear
              <CloseIcon />
            </Button>
            <TagList
              class="tag-list"
              :tags="selectedTags"
              clickable
              @click="deselectTag"
            >
              <CloseIcon slot="icon" />
            </TagList>
          </div>
        </div>
        <div>
          <template v-for="(category, index) in categoriesDisplayed">
            <NodeRepositoryCategory
              :key="`tag-${index}`"
              :category="category"
            />
            <span
              :key="index"
              class="break full"
            />
          </template>
        </div>
        <div />
      </div>
    </div>
  </ScrollViewContainer>
</template>

<style lang="postcss" scoped>
.repo {
  padding: 15px 20px;
  font-family: "Roboto Condensed", sans-serif;
  height: 100%;
  display: flex;
  flex-direction: column;

  & .no-matching-search {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    height: 100%;
  }

  & h4 {
    cursor: pointer;
    font-size: 18px;
    font-weight: 400;
    margin: 16px 0px;
  }

  & .break:not(:last-child) {
    height: 1px;
    margin-bottom: 10px;
    padding-top: 1px;
    width: 100%;
    display: block;
    background-color: var(--knime-silver-sand);

    &.full {
      width: 360px;
      margin-left: -20px;
      margin-bottom: 14px;
    }
  }

  & .tags {
    display: flex;
    flex-wrap: wrap;
    justify-content: left;
    padding: 13px 0;
  }

  & .filter {
    margin-bottom: 10px;

    & .filter-tags {
      margin-bottom: 12px;

      & .clear-button {
        float: right;
        padding: 0;
      }

      & .tag-list {
        margin-top: 8px;
      }
    }
  }
}
</style>
