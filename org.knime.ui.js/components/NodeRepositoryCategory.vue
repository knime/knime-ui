<script>
import { mapState } from 'vuex';
import NodePreview from '~/webapps-common/ui/components/node/NodePreview';
import Button from '~/webapps-common/ui/components/Button';

const CATEGORY_LIMIT = 6;

export default {
    components: {
        NodePreview,
        Button
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
                this.$store.dispatch('nodeRepository/selectTag', this.category.tag);
            } else {
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
          class="node"
        >
          <label
            v-if="node.id"
            :title="node.name"
            class="label"
          >
            {{ node.name }}
          </label>
          <NodePreview v-bind="node" />
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

      & .node {
        width: 100px;
        height: 75px;
        margin: 0 2px 10px;
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

    &:active {
      background-color: var(--knime-black);
    }
  }
}
</style>
