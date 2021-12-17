<script>
import { mapState } from 'vuex';
import Button from '~/webapps-common/ui/components/Button';
import NodeTemplate from '~/components/noderepo/NodeTemplate';

const CATEGORY_LIMIT = 6;

export default {
    components: {
        Button,
        NodeTemplate
    },
    props: {
        category: {
            type: Object,
            required: true
        }
    },
    computed: {
        ...mapState('nodeRepository', [
            'totalNumNodes'
        ]),
        showMoreMessage() {
            if (this.category.tag) {
                return `More "${this.category.tag}" nodes`;
            }
            return 'Show more…';
        },
        hasMoreNodes() {
            if (this.category.tag) {
                return this.category.nodes?.length === CATEGORY_LIMIT;
            } else {
                return this.category.nodes?.length < this.totalNumNodes;
            }
        }
    },
    methods: {
        showMoreNodes() {
            if (this.category.tag) {
                this.$emit('click-tag', this.category.tag);
            } else {
                // TODO NXT-616: emit instead of directly dispatch
                this.$store.dispatch('nodeRepository/searchNodesNextPage', true);
            }
        }
    }
};
</script>

<template>
  <div class="category">
    <span
      v-if="category.tag"
      class="category-title"
      @click="showMoreNodes"
    >
      {{ category.tag }}
    </span>
    <div class="nodes-container">
      <ul class="nodes">
        <li
          v-for="node in category.nodes"
          :key="node.id"
        >
          <NodeTemplate :node-template="node" />
        </li>
      </ul>
      <Button
        v-if="hasMoreNodes"
        compact
        with-border
        class="show-more"
        @click="showMoreNodes"
      >
        {{ showMoreMessage }}
      </Button>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.category {
  margin: 0;
  font-family: "Roboto Condensed", sans-serif;
  user-select: none;

  & .category-title {
    border: 1px solid var(--knime-dove-gray);
    margin: 13px 5px 13px 0;
    padding: 3px 5px;
    line-height: 15px;
    display: inline-block;
    font-weight: 500;
    font-size: 14px;
    color: var(--knime-dove-gray);
    cursor: pointer;

    &:hover {
      color: var(--knime-white);
      background-color: var(--knime-masala);
      border-color: var(--knime-masala);
    }

    &:active {
      color: var(--knime-white);
      background-color: var(--knime-black);
      border-color: var(--knime-black);
    }
  }

  & .nodes-container {
    margin-bottom: 13px;

    & .nodes {
      padding: 0;
      display: flex;
      flex-wrap: wrap;
      margin-right: -5px;
      margin-left: -5px;
      list-style-type: none;
    }
  }

  & .show-more {
    color: var(--knime-masala);
    font-weight: 400;
    margin: 0 auto 10px;
    display: block;

    &:active {
      background-color: var(--knime-black);
    }
  }
}
</style>
