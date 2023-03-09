<script>
import Button from 'webapps-common/ui/components/Button.vue';
import NodeTemplate from '@/components/nodeRepository/NodeTemplate.vue';

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
        },
        selectedNode: {
            type: Object,
            default: null
        }
    },
    emits: ['showMore'],
    methods: {
        nodeTemplateProps(node, index) {
            return {
                nodeTemplate: node,
                isSelected: this.selectedNode?.id === node.id,
                index
            };
        }
    }
};
</script>

<template>
  <div class="nodes-container">
    <ul class="nodes">
      <li
        v-for="(node, index) in nodes"
        ref="nodes"
        :key="node.id"
        :data-index="index"
        :data-node-id="node.id"
        tabindex="-1"
      >
        <slot
          name="item"
          v-bind="nodeTemplateProps(node, index)"
        >
          <NodeTemplate
            v-bind="nodeTemplateProps(node, index)"
          />
        </slot>
      </li>
    </ul>
    <Button
      v-if="hasMoreNodes"
      compact
      with-border
      class="show-more"
      @click="$emit('showMore')"
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

    & li:focus {
      outline: red;
    }
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
