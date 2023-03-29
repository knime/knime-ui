<script>
import NodeList from './NodeList.vue';
import DraggableNodeTemplate from '@/components/nodeRepository/DraggableNodeTemplate.vue';

const CATEGORY_LIMIT = 6;

export default {
    components: {
        DraggableNodeTemplate,
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
        },
        selectedNode: {
            type: [Object, null],
            required: true
        }
    },
    emits: ['selectTag'],
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
      @click="$emit('selectTag', tag)"
    >
      {{ tag }}
    </span>
    <NodeList
      :nodes="nodes"
      :has-more-nodes="hasMoreNodes"
      :selected-node="selectedNode"
      @show-more="$emit('selectTag', tag)"
    >
      <template #item="itemProps">
        <DraggableNodeTemplate v-bind="itemProps" />
      </template>
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
