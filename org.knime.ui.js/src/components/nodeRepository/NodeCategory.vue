<script>
import NodeList from './NodeList.vue';

const CATEGORY_LIMIT = 6;

export default {
    components: {
        NodeList
    },
    props: {
        tag: {
            type: String,
            required: true
        },
        nodes: {
            type: Array,
            default: () => []
        }
    },
    computed: {
        hasMoreNodes() {
            return this.nodes.length >= CATEGORY_LIMIT;
        }
    }
};
</script>

<template>
  <div class="category">
    <span
      class="category-title"
      @click="$emit('select-tag', tag)"
    >
      {{ tag }}
    </span>
    <NodeList
      :nodes="nodes"
      :has-more-nodes="hasMoreNodes"
      @show-more="$emit('select-tag', tag)"
    >
      <template #more-button>More {{ tag }} nodes</template>
    </NodeList>
  </div>
</template>

<style lang="postcss" scoped>
.category-title {
  border: 1px solid var(--knime-dove-gray);
  margin: 13px 5px 13px 0;
  padding: 3px 5px;
  line-height: 15px;
  display: inline-block;
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
</style>
