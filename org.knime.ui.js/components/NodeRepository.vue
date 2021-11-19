<script>
import { mapState, mapGetters } from 'vuex';

import NodeRepositoryCategory from '~/components/NodeRepositoryCategory';
import NodeSearcher from '~/components/NodeSearcher';
import ScrollViewContainer from '~/components/ScrollViewContainer';
import BreadcrumbEventBased from '~/components/BreadcrumbEventBased';
import SelectableTagList from '~/components/SelectableTagList';
import ClosePopoverIcon from '~/webapps-common/ui/assets/img/icons/arrow-prev.svg?inline';

export default {
    components: {
        BreadcrumbEventBased,
        SelectableTagList,
        NodeRepositoryCategory,
        NodeSearcher,
        ClosePopoverIcon,
        ScrollViewContainer
    },
    data() {
        return {
            tagsPoppedOut: false
        };
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
        },
        unselectedTags() {
            return this.tags.filter((t) => !this.selectedTags.includes(t));
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
        toggleTag(tag) {
            if (tag.selected) {
                this.deselectTag(tag.text);
            } else {
                this.selectTag(tag.text);
            }
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
        <div class="title-and-search">
          <BreadcrumbEventBased
            :items="breadcrumbItems"
            class="repo-breadcrumb"
            @click="onBreadcrumbClick"
          />
          <NodeSearcher />
        </div>
        <div
          v-if="nodeSearching"
          class="tags"
        >
          <div class="popout">
            <SelectableTagList
              ref="tagList"
              :selected-tags="selectedTags"
              :tags="unselectedTags"
              clickable
              hide-more-on-click
              @click="toggleTag"
            />
            <button
              v-if="$refs.tagList && $refs.tagList.displayAll"
              class="tags-popout-close"
              @click="$refs.tagList.hideMore"
            >
              <ClosePopoverIcon />
            </button>
          </div>
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
    position: sticky;
    background: var(--knime-gray-ultra-light);
    z-index: 2;
    top: 0;
    padding-top: 15px;

    // padding moved inside of content for popout
    & .break.full {
      margin-left: 0;
    }

  }

  & .title-and-search {
    padding: 0 20px 13px;
  }

  & .content {
    padding: 0 20px 15px;
  }

  & .tags {
    display: flex;
    flex-wrap: wrap;
    justify-content: left;
    align-items: start;

    & .popout {
      height: 61px;
    }

    & .wrapper {
      padding: 0 20px 13px;

      &.show-all {
        padding-bottom: 19px;
        max-height: 50vh;
        overflow: auto;
        background: var(--knime-gray-ultra-light);
        box-shadow: var(--knime-gray-dark) 0 4px 6px;
      }
    }
  }

  & .tags-popout-close {
    position: relative;
    z-index: 1;
    border: none;
    width: 100%;
    padding: 0;
    display: flex;
    height: 12px;
    margin-top: -12px;
    justify-content: center;
    background-color: var(--knime-porcelain);
    cursor: pointer;

    &:hover {
      background-color: var(--knime-silver-sand);
    }

    & svg {
      width: 10px;
      height: 10px;
      stroke: var(--knime-masala);
      stroke-width: calc(32px / 10);
      transform: rotate(90deg);
      transition: transform 0.3s ease;
    }
  }

}
</style>
