<script>
import Button from 'webapps-common/ui/components/Button.vue';
import NodeTemplate from '@/components/nodeRepository/NodeTemplate.vue';

const NODES_PER_ROW = 3;

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
    emits: ['enter-key', 'showMore', 'update:selectedNode', 'navReachedTop', 'navReachedEnd'],
    expose: ['focusFirst', 'focusLast'],
    methods: {
        nodeTemplateProps(node) {
            return {
                nodeTemplate: node,
                isSelected: this.selectedNode?.id === node.id
            };
        },
        focusLast() {
            this.focusItem(this.nodes[this.nodes.length - 1]);
        },
        focusFirst() {
            this.focusItem(this.nodes[0]);
        },
        focusItem(node) {
            // focus for nav to work
            this.$refs.list.focus();
            // select the item if the current selection is not in our list
            if (!this.nodes.find(node => node.id === this.selectedNode?.id)) {
                this.$emit('update:selectedNode', node);
            }
        },
        onKeyDown(key) {
            // no navigation for empty nodes
            if (this.nodes.length < 1) {
                return;
            }

            const activeItemIndex = this.nodes.findIndex(x => x.id === this.selectedNode?.id);

            // switch from items to upper input elements (e.g. search box) on the first row
            if (activeItemIndex < NODES_PER_ROW && key === 'up') {
                this.$emit('navReachedTop');
                return;
            }

            if (activeItemIndex + NODES_PER_ROW > this.nodes.length && key === 'down') {
                this.$emit('navReachedEnd');
                return;
            }

            const focusNext = (indexOffset) => {
                const nextIndex = activeItemIndex + indexOffset;
                if (nextIndex >= this.nodes.length) {
                    this.$emit('navReachedEnd');
                    return;
                }
                const node = this.nodes[nextIndex];
                if (node) {
                    this.$emit('update:selectedNode', node);
                }
                // use a DOM query as refs are not soreted and we would need to sort them every time
                const nodeListElement = this.$refs.list.querySelector(`[data-index="${nextIndex}"]`);
                nodeListElement?.focus();
            };

            // items navigation
            if (key === 'up') {
                focusNext(-NODES_PER_ROW);
                return;
            }

            if (key === 'down') {
                focusNext(NODES_PER_ROW);
                return;
            }

            if (key === 'left') {
                focusNext(-1);
                return;
            }

            if (key === 'right') {
                focusNext(+1);
            }
        }
    }
};
</script>

<template>
  <div class="nodes-container">
    <ul
      ref="list"
      class="nodes"
      tabindex="-1"
      @keydown.left.stop="onKeyDown('left')"
      @keydown.up.stop.prevent="onKeyDown('up')"
      @keydown.down.stop.prevent="onKeyDown('down')"
      @keydown.right.stop="onKeyDown('right')"
    >
      <li
        v-for="(node, index) in nodes"
        :key="node.id"
        tabindex="-1"
        :class="{ 'no-selection': selectedNode === null }"
        :data-index="index"
        @keydown.enter.stop.prevent="$emit('enter-key', node)"
      >
        <slot
          name="item"
          v-bind="nodeTemplateProps(node)"
        >
          <NodeTemplate
            v-bind="nodeTemplateProps(node)"
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

    &:focus {
      outline: none;
    }

    & li {
      /* fixes the scrolling to top selected border cut off problem */
      padding: 3px 0;

      &:focus {
        outline: none;
      }
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
