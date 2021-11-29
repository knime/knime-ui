<script>
import { mapState } from 'vuex';

import TagList from '~/webapps-common/ui/components/TagList';
import Button from '~/webapps-common/ui/components/Button';
import CloseIcon from '~/webapps-common/ui/assets/img/icons/close.svg?inline';
import NodeRepositoryCategory from '~/components/NodeRepositoryCategory';
import ScrollViewContainer from '~/components/ScrollViewContainer';

export default {
    components: {
        TagList,
        Button,
        CloseIcon,
        NodeRepositoryCategory,
        ScrollViewContainer
    },
    computed: {
        ...mapState('nodeRepository', [
            'nodes',
            'selectedTags',
            'tags',
            'nodesPerCategory',
            'scrollPosition'
        ]),
        categoriesDisplayed() {
            if (this.selectedTags.length > 0) {
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
      <h2>Repository</h2>
      <hr>
      <template v-if="selectedTags.length">
        <div class="tags">
          <TagList
            :tags="tags.filter((t) => !selectedTags.includes(t))"
            clickable
            @click="selectTag"
          />
        </div>
        <hr class="full">
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
          <hr
            :key="index"
            class="full"
          >
        </template>
      </div>
    </div>
  </ScrollViewContainer>
</template>

<style lang="postcss" scoped>
.repo {
  font-family: "Roboto Condensed", sans-serif;
  padding: 15px 20px;
  user-select: none;

  & h2 {
    font-size: 18px;
    font-weight: 400;
    margin: 12px auto;
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

    &:last-child {
      display: none;
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
