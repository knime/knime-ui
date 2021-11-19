<script>
import { mapState, mapGetters } from 'vuex';

import TagList from '~/webapps-common/ui/components/TagList';
import CloseIcon from '~/webapps-common/ui/assets/img/icons/close.svg?inline';
import NodeRepositoryCategory from '~/components/NodeRepositoryCategory';
import NodeSearcher from '~/components/NodeSearcher';
import ScrollViewContainer from '~/components/ScrollViewContainer';
import BreadcrumbEventBased from '~/components/BreadcrumbEventBased';

export default {
    components: {
        BreadcrumbEventBased,
        TagList,
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
            'query',
            'scrollPosition'
        ]),
        ...mapGetters('nodeRepository', [
            'nodeSearching'
        ]),
        categoriesDisplayed() {
            if (this.nodeSearching) {
                const result = {
                    nodes: this.nodes
                };
                return [result];
            }
            return this.nodesPerCategory;
        },
        breadcrumbItems() {
            let items = [{ text: 'Repository' }];
            if (this.nodeSearching) {
                items[0].id = 'clear';
                items.push({ text: 'Results' });
            }
            return items;
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
        onBreadcrumbClick(e) {
            if (e.id === 'clear') {
                this.clearSelectedTags();
                this.clearNodeSearching();
            }
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
      <div class="header">
        <BreadcrumbEventBased
          :items="breadcrumbItems"
          class="repo-breadcrumb"
          @click="onBreadcrumbClick"
        />
        <NodeSearcher />
        <div class="tags">
          <TagList
            class="selected-tags"
            :tags="selectedTags"
            clickable
            @click="deselectTag"
          >
            <CloseIcon slot="icon" />
          </TagList>
          <TagList
            v-if="nodeSearching"
            :tags="tags.filter((t) => !selectedTags.includes(t))"
            clickable
            @click="selectTag"
          />
        </div>
        <span class="break full force" />
      </div>
      <div
        v-if="nodeSearching && !nodes.length"
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
          <span
            :key="index"
            class="break full"
          />
        </template>
      </div>
    </div>
  </ScrollViewContainer>
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
    margin: 0;

    & >>> a {
      text-decoration: underline;
    }
  }

  & .break:not(:last-child),
  & .break.force {
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

  & .header {
    /* This can be removed if `scrollbar-gutter: stable;` is fully supported in all browsers */
    width: 344px;
    position: sticky;
    background: var(--knime-gray-ultra-light);
    z-index: 2;
    top: 0;
    padding: 15px 20px 0;
  }

  & .content {
    padding: 0 20px 15px;
  }

  & .selected-tags {
    & >>> .clickable {
      color: var(--knime-white);
      background-color: var(--knime-masala);
      border-color: var(--knime-masala);

      & svg {
        stroke: var(--knime-white);
      }

      &:hover {
        color: var(--knime-dove-gray);
        background-color: transparent;
        border-color: var(--knime-dove-gray);

        & svg {
          stroke: var(--knime-dove-gray);
        }
      }
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
  }
}
</style>
