<script>
import { mapState } from 'vuex';

import Tag from './Tag';
import NodePreview from '~/webapps-common/ui/components/node/NodePreview';
import Button from '~/webapps-common/ui/components/Button';
import CloseIcon from '~/webapps-common/ui/assets/img/icons/close.svg?inline';

export default {
    components: {
        Tag,
        NodePreview,
        Button,
        CloseIcon
    },
    computed: {
        ...mapState('nodeRepo', [
            'nodes',
            'nodeTemplates',
            'totalNumNodes',
            'selectedTags',
            'tags'
        ]),
        nodeRows() {
            let rows = [];
            const N_PER_ROW = 3;
            if (this.nodes.length) {
                let numRows = this.nodes.length / N_PER_ROW;
                for (let i = 0; i < numRows; i++) {
                    let row = [];
                    for (let n = 0; n < N_PER_ROW; n++) {
                        let nodeInd = i * N_PER_ROW + n;
                        if (nodeInd < this.nodes.length) {
                            row.push(this.nodes[nodeInd]);
                        }
                    }
                    rows.push(row);
                }
            }
            return rows;
        }
    },
    mounted() {
        this.$store.dispatch('nodeRepo/searchNodes', true);
    },
    methods: {
        loadMoreNodes() {
            this.$store.dispatch('nodeRepo/searchNodes', true);
        },
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
  <div class="repo">
    <h4>
      Repository
    </h4>
    <span class="break" />
    <div class="tags">
      <Tag
        v-for="tag in tags.filter(t => !selectedTags.includes(t))"
        :key="tag"
        @click.native="selectTag(tag)"
      >
        {{ tag }}
      </Tag>
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
        <br>
        <br>
        <Tag
          v-for="tag in selectedTags"
          :key="tag"
          class="selected-tag"
          @click.native="deselectTag(tag)"
        >
          {{ tag }}
          <CloseIcon />
        </Tag>
      </div>
      <div
        v-for="(row, ind) in nodeRows"
        :key="ind"
        class="row"
      >
        <span
          v-for="nodeId in row"
          :key="nodeId"
          class="node"
        >
          <label :title="nodeTemplates[nodeId].name">
            {{ nodeTemplates[nodeId].name }}
          </label>
          <NodePreview v-bind="nodeTemplates[nodeId]" />
        </span>
      </div>
    </div>
    <template v-if="selectedTags.length && nodes.length < totalNumNodes">
      <Button
        compact
        with-border
        class="show-more"
        @click="loadMoreNodes"
      >
        Show more…
      </Button>
    </template>
  </div>
</template>
<style lang="postcss" scoped>

.repo {
  margin: 15px 20px;
  font-family: "Roboto Condensed", sans-serif;

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

      & > .tag {
        padding: 4px 6px;
      }

      & .clear-button {
        float: right;
        padding: 0;
      }
    }

    & .row {
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
    color: var(--knime-masala);
    font-weight: 400;
    margin: 0 auto 10px;
    display: block;
  }
}
</style>
