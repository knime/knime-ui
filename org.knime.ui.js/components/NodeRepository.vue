<script>
import { mapState } from 'vuex';

import NodePreview from '~/webapps-common/ui/components/node/NodePreview';
import TagList from '~/webapps-common/ui/components/TagList';
import Button from '~/webapps-common/ui/components/Button';
import CloseIcon from '~/webapps-common/ui/assets/img/icons/close.svg?inline';

export default {
    components: {
        NodePreview,
        TagList,
        Button,
        CloseIcon
    },
    computed: {
        ...mapState('nodeRepository', [
            'nodes',
            'nodeTemplates',
            'totalNumNodes',
            'selectedTags',
            'tags'
        ])
    },
    mounted() {
        this.$store.dispatch('nodeRepository/searchNodes', true);
    },
    methods: {
        loadMoreNodes() {
            this.$store.dispatch('nodeRepository/searchNodes', true);
        },
        selectTag(tag) {
            this.$store.dispatch('nodeRepository/selectTag', tag);
        },
        deselectTag(tag) {
            this.$store.dispatch('nodeRepository/deselectTag', tag);
        },
        clearSelectedTags() {
            this.$store.dispatch('nodeRepository/clearSelectedTags');
        }
    }
};
</script>

<template>
  <div class="repo">
    <h4>Repository</h4>
    <span class="break" />
    <div class="tags">
      <TagList
        :tags="tags.filter(t => !selectedTags.includes(t))"
        clickable
        @click="selectTag"
      />
    </div>
    <span class="break full" />
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
        <TagList
          class="tag-list"
          :tags="selectedTags"
          clickable
          @click="deselectTag"
        >
          <CloseIcon slot="icon" />
        </TagList>
      </div>
      <ul class="nodes">
        <li
          v-for="nodeId in nodes"
          :key="nodeId"
          class="node"
        >
          <label :title="nodeTemplates[nodeId].name">
            {{ nodeTemplates[nodeId].name }}
          </label>
          <NodePreview v-bind="nodeTemplates[nodeId]" />
        </li>
      </ul>
    </div>
    <Button
      v-if="selectedTags.length && nodes.length < totalNumNodes"
      compact
      with-border
      class="show-more"
      @click="loadMoreNodes"
    >
      Show more…
    </Button>
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

  & .break {
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

      & .tag-list {
        margin-top: 8px;
      }
    }

    & .nodes {
      padding: 0;
      display: flex;
      flex-wrap: wrap;
      margin-right: -5px;
      margin-left: -5px;

      & .node {
        width: 100px;
        height: 75px;
        margin: 0 5px;
        padding-bottom: 42px;
        position: relative;
        display: flex;
        flex-direction: column-reverse;
        align-items: center;
        font-size: 12px;
        font-weight: 700;
        text-align: center;

        & label {
          max-height: 26px;
          max-width: 100px;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          overflow: hidden;
        }

        & svg {
          width: 70px;
          position: absolute;
          bottom: -15px;
        }
      }
    }
  }

  & .show-more {
    font-weight: 400;
    margin: 0 auto 10px;
    display: block;
  }
}
</style>
