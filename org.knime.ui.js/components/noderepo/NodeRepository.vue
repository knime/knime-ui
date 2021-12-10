<script>
import { mapState, mapGetters } from 'vuex';

import NodeRepositoryCategory from '~/components/noderepo/NodeRepositoryCategory';
import NodeSearcher from '~/components/NodeSearcher';
import ScrollViewContainer from '~/components/noderepo/ScrollViewContainer';
import ActionBreadcrumb from '~/components/ActionBreadcrumb';
import CloseableTagList from '~/components/CloseableTagList';

export default {
    components: {
        CloseableTagList,
        ActionBreadcrumb,
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
        <NodeSearcher />
      </div>
      <CloseableTagList
        v-if="nodeSearching"
        :selected-tags="selectedTags"
        :tags="unselectedTags"
        @click="toggleTag"
      />
      <hr class="force">
    </div>
    <ScrollViewContainer
      :initial-position="scrollPosition"
      @scroll-bottom="lazyLoadCategories"
      @save-position="updateScrollPosition"
    >
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
