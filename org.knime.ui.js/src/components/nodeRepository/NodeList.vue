<script>
import Button from "webapps-common/ui/components/Button.vue";
import CircleArrowIcon from "webapps-common/ui/assets/img/icons/circle-arrow-right.svg";
import NodeTemplate from "@/components/nodeRepository/NodeTemplate.vue";

const NODES_PER_ROW = 3;

export default {
  components: {
    Button,
    CircleArrowIcon,
    NodeTemplate,
  },
  props: {
    nodes: {
      type: Array,
      default: () => [],
    },
    hasMoreNodes: {
      type: Boolean,
      default: false,
    },
    selectedNode: {
      type: [Object, null],
      default: null,
    },
    highlightFirst: {
      type: Boolean,
      default: false,
    },
  },
  emits: [
    "enter-key",
    "showMore",
    "update:selectedNode",
    "navReachedTop",
    "navReachedEnd",
  ],
  watch: {
    selectedNode: {
      immediate: false,
      handler(newSelectedNode) {
        if (!newSelectedNode || !this.nodes) {
          return;
        }
        const nodeIndex = this.nodes.findIndex(
          (node) => node.id === newSelectedNode?.id,
        );
        if (nodeIndex >= 0) {
          this.domFocusNode(nodeIndex);
        }
      },
    },
  },
  expose: ["focusFirst", "focusLast"],
  methods: {
    nodeTemplateProps(node, index) {
      return {
        nodeTemplate: node,
        isHighlighted:
          this.selectedNode === null && index === 0 && this.highlightFirst,
        isSelected: this.selectedNode?.id === node.id,
      };
    },
    focusLast() {
      this.focusItem(this.nodes?.at(-1));
    },
    focusFirst() {
      this.focusItem(this.nodes?.at(0));
    },
    focusItem(focusNode) {
      // select the item if the current selection is not in our list
      if (
        focusNode &&
        !this.nodes.find((someNode) => someNode.id === this.selectedNode?.id)
      ) {
        this.$emit("update:selectedNode", focusNode);
      }
    },
    domFocusNode(nodeIndex) {
      const nodeListElement = this.$el.querySelector(
        `[data-index="${nodeIndex}"]`,
      );
      nodeListElement?.focus();
    },
    onKeyDown(key) {
      // no navigation for empty nodes
      if (this.nodes.length < 1) {
        return;
      }

      const activeItemIndex = this.nodes.findIndex(
        (node) => node.id === this.selectedNode?.id,
      );

      // switch from items to upper input elements (e.g. search box) on the first row
      if (activeItemIndex < NODES_PER_ROW && key === "up") {
        this.$emit("navReachedTop");
        return;
      }

      // switch to next list on down key
      if (
        activeItemIndex + NODES_PER_ROW > this.nodes.length &&
        key === "down"
      ) {
        this.$emit("navReachedEnd");
        return;
      }

      const selectNextNode = (indexOffset) => {
        const nextIndex = activeItemIndex + indexOffset;
        if (nextIndex >= this.nodes.length) {
          this.$emit("navReachedEnd");
          return;
        }
        const node = this.nodes[nextIndex];
        if (node) {
          this.$emit("update:selectedNode", node);
        }
      };

      // items navigation
      if (key === "up") {
        selectNextNode(-NODES_PER_ROW);
        return;
      }

      if (key === "down") {
        selectNextNode(NODES_PER_ROW);
        return;
      }

      if (key === "left") {
        selectNextNode(-1);
        return;
      }

      if (key === "right") {
        selectNextNode(+1);
      }
    },
  },
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
        :data-index="index"
        @keydown.enter.stop.prevent="$emit('enter-key', node)"
      >
        <slot name="item" v-bind="nodeTemplateProps(node, index)">
          <NodeTemplate v-bind="nodeTemplateProps(node, index)" />
        </slot>
      </li>
      <li>
        <Button
          v-if="hasMoreNodes"
          compact
          without-border
          class="show-more"
          @click="$emit('showMore')"
        >
          <slot name="more-button" /><br />
          <CircleArrowIcon class="icon" />
        </Button>
      </li>
    </ul>
  </div>
</template>

<style lang="postcss" scoped>
.nodes-container {
  margin-bottom: 13px;

  & .nodes {
    display: grid;
    grid-template-columns: repeat(3, 1fr);

    /* kill list default styles */
    padding: 0;
    margin: 0;
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
  margin: 27px auto 0;
  display: block;

  &:active {
    background-color: var(--knime-black);
  }

  & svg {
    margin: 0;
  }
}
</style>
