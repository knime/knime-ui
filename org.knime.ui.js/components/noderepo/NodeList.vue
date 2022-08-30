<script>
import Button from '@/webapps-common/ui/components/Button.vue';
import NodeTemplate from '@/components/noderepo/NodeTemplate.vue';

export default {
    components: {
        Button,
        NodeTemplate
    },
    props: {
        nodes: {
            type: Array,
            default: () => []
        },
        hasMoreNodes: {
            type: Boolean,
            default: false
        }
    }
};
</script>

<template>
  <div class="nodes-container">
    <ul class="nodes">
      <li
        v-for="node in nodes"
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
      @click="$emit('show-more')"
    >
      <slot name="more-button" />
    </Button>
  </div>
</template>

<style lang="postcss" scoped>
.nodes-container {
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

.show-more {
  color: var(--knime-masala);
  font-weight: 400;
  margin: 0 auto 10px;
  display: block;

  &:active {
    background-color: var(--knime-black);
  }
}
</style>
