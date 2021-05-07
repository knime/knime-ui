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
    <div v-if="selectedTags.length">
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
          {{ nodeTemplates[nodeId].name }}
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
      <span class="break full" />
    </template>
  </div>
</template>
<style lang="postcss" scoped>

.repo {
  margin: 15px 20px;

  & h4 {
    font-size: 18px;
    font-weight: 400;
  }

  & .break {
    height: 1px;
    width: 100%;
    display: block;
    background-color: var(--knime-masala);
    margin-bottom: 10px;

    &.full {
      width: 360px;
      margin-left: -20px;
    }
  }

  & .tags {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    padding: 10px;
  }

  & .filter-tags {
    margin-bottom: 20px;
    font-size: 14px;

    & .clear-button {
      float: right;
      padding: 0;
    }

    & .selected-tag >>> svg {
      stroke: var(--knime-masala);
      margin: 0 -2px 1px 2px;
      height: 10px;
      width: 10px;
    }
  }

  & .row {
    display: flex;
    flex-wrap: wrap;
    margin-right: -5px;
    margin-left: -5px;

    & .node {
      width: 100px;
      height: 70px;
      padding-bottom: 60px;
      margin: 5px;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      font-size: 12px;
      font-weight: 700;
      text-align: center;
      font-family: "Roboto Condensed", sans-serif;
      word-break: break-word;

      & svg {
        width: 75px;
        position: absolute;
        bottom: 0;
      }
    }
  }

  & .show-more {
    width: 50%;
    margin: 0 auto 10px;
    display: block;
  }
}
</style>
