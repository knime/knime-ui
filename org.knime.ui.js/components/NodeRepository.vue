<script>
import { mapState } from 'vuex';

import TagList from '~/webapps-common/ui/components/TagList';
import Button from '~/webapps-common/ui/components/Button';
import CloseIcon from '~/webapps-common/ui/assets/img/icons/close.svg?inline';
import NodeRepositoryCategory from '~/components/NodeRepositoryCategory';

export default {
    components: {
        TagList,
        Button,
        CloseIcon,
        NodeRepositoryCategory
    },
    computed: {
        ...mapState('nodeRepo', [
            'nodes',
            'nodeTemplates',
            'totalNumNodes',
            'selectedTags',
            'tags',
            'nodesPerCategory'
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
    created() {
        this.$root.$on('scroll-node-repo', () => {
            const categoriesView = this.$refs.repo;
            if (categoriesView) {
                let scroller = this.$parent.$refs.scroller;
                const scrollPos = scroller.scrollTop;
                const viewHeight = categoriesView.getBoundingClientRect().height;
                const viewScreen = scroller.getBoundingClientRect().height;

                if (viewHeight - scrollPos - viewScreen <= 0) {
                    this.$store.dispatch('nodeRepo/getAllNodes', true);
                }
            }
        });
    },
    mounted() {
        this.$store.dispatch('nodeRepo/getAllNodes', false);
    },
    methods: {
        selectTag(tag) {
            this.$store.dispatch('nodeRepo/selectTag', tag);
        },
        deselectTag(tag) {
            this.$store.dispatch('nodeRepo/deselectTag', tag);
        },
        clearSelectedTags() {
            this.$store.dispatch('nodeRepo/clearSelectedTags');
        }
    }
};
</script>

<template>
  <div
    ref="repo"
    class="repo"
  >
    <h4>Repository</h4>
    <span class="break" />
    <template v-if="selectedTags.length">
      <div class="tags">
        <TagList
          :tags="tags.filter((t) => !selectedTags.includes(t))"
          :clickable="true"
          @click="selectTag"
        />
      </div>
      <span class="break full" />
    </template>

    <div
      v-if="selectedTags.length"
      class="node-section"
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
        <br>
        <br>
        <TagList
          :tags="selectedTags"
          :clickable="true"
          @click="deselectTag"
        >
          <CloseIcon slot="icon" />
        </TagList>
      </div>
    </div>
    <div class="node-section">
      <template v-for="(category, ind) in categoriesDisplayed">
        <NodeRepositoryCategory
          :key="`tag-${ind}`"
          :category="category"
        />
        <span
          :key="ind"
          class="break full"
        />
      </template>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.repo {
  margin: 15px 20px;
  font-family: "Roboto Condensed", sans-serif;
  user-select: none;

  & h4 {
    font-size: 18px;
    font-weight: 400;
    margin: 14px auto;
  }

  & .break:not(:last-child) {
    height: 1px;
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

  & .node-section {
    margin-bottom: 10px;

    & .filter-tags {
      margin-bottom: 12px;

      & .clear-button {
        float: right;
        padding: 0;
      }
    }
  }
}
</style>
