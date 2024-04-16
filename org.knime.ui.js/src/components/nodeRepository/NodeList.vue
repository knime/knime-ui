<script lang="ts">
import Button from "webapps-common/ui/components/Button.vue";
import CircleArrowIcon from "webapps-common/ui/assets/img/icons/circle-arrow-right.svg";
import NodeTemplate from "@/components/nodeRepository/NodeTemplate/NodeTemplate.vue";
import { defineComponent, type PropType } from "vue";
import type { NodeRepositoryDisplayModesType } from "@/store/settings";
import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";

const NODES_PER_ROW_ICON_MODE = 3;
const NODES_PER_ROW_LIST_MODE = 1;

export default defineComponent({
  components: {
    Button,
    CircleArrowIcon,
    NodeTemplate,
  },
  props: {
    nodes: {
      type: Array as PropType<NodeTemplateWithExtendedPorts[]>,
      default: () => [],
    },
    hasMoreNodes: {
      type: Boolean,
      default: false,
    },
    displayMode: {
      type: String as PropType<NodeRepositoryDisplayModesType>,
      default: "icon",
    },
    selectedNode: {
      type: Object as PropType<NodeTemplateWithExtendedPorts | null>,
      default: null,
    },
    showDescriptionForNode: {
      type: Object as PropType<NodeTemplateWithExtendedPorts | null>,
      default: null,
    },
    highlightFirst: {
      type: Boolean,
      default: false,
    },
  },
  emits: [
    "enterKey",
    "showMore",
    "update:selectedNode",
    "navReachedTop",
    "navReachedEnd",
  ],
  computed: {
    nodesPerRow() {
      return this.displayMode === "icon"
        ? NODES_PER_ROW_ICON_MODE
        : NODES_PER_ROW_LIST_MODE;
    },
  },
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
    nodeTemplateProps(node: NodeTemplateWithExtendedPorts, index: number) {
      return {
        nodeTemplate: node,
        isHighlighted:
          this.selectedNode === null && index === 0 && this.highlightFirst,
        isSelected: this.selectedNode?.id === node.id,
        isDescriptionActive: this.showDescriptionForNode?.id === node.id,
        displayMode: this.displayMode,
      };
    },
    focusLast() {
      this.focusItem(this.nodes?.at(-1));
    },
    focusFirst() {
      this.focusItem(this.nodes?.at(0));
    },
    focusItem(focusNode: NodeTemplateWithExtendedPorts | undefined) {
      // select the item if the current selection is not in our list
      if (
        focusNode &&
        !this.nodes.find((someNode) => someNode.id === this.selectedNode?.id)
      ) {
        this.$emit("update:selectedNode", focusNode);
      }
    },
    domFocusNode(nodeIndex: number) {
      const nodeListElement = this.$el.querySelector(
        `[data-index="${nodeIndex}"]`,
      );
      nodeListElement?.focus();
    },
    onKeyDown(key: string) {
      // no navigation for empty nodes
      if (this.nodes.length < 1) {
        return;
      }

      const activeItemIndex = this.nodes.findIndex(
        (node) => node.id === this.selectedNode?.id,
      );

      // switch from items to upper input elements (e.g. search box) on the first row
      if (activeItemIndex < this.nodesPerRow && key === "up") {
        this.$emit("navReachedTop");
        return;
      }

      // switch to next list on down key
      if (
        activeItemIndex + this.nodesPerRow > this.nodes.length &&
        key === "down"
      ) {
        this.$emit("navReachedEnd");
        return;
      }

      const selectNextNode = (indexOffset: number) => {
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
        selectNextNode(this.nodesPerRow * -1);
        return;
      }

      if (key === "down") {
        selectNextNode(this.nodesPerRow);
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
});
</script>

<template>
  <div class="nodes-container">
    <ul
      ref="list"
      :class="['nodes', `display-${displayMode}`]"
      tabindex="0"
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
        @keydown.enter.stop.prevent="$emit('enterKey', node)"
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
@import url("@/assets/mixins.css");

.nodes-container {
  margin-bottom: 13px;

  & .nodes {
    display: grid;
    grid-template-columns: repeat(v-bind(nodesPerRow), 1fr);
    width: 100%;
    font-family: "Roboto Condensed", sans-serif;
    margin: 5px 0 0;

    /* reset default ul styles */
    padding: 0;
    list-style-type: none;

    &:focus {
      outline: none;
    }

    &:focus-visible {
      @mixin focus-style;
    }

    & .show-more {
      color: var(--knime-masala);
      font-weight: 400;
    }

    & li {
      &:focus {
        outline: none;
      }
    }

    &.display-list {
      flex-grow: 1;

      & .show-more {
        margin: 0;
        display: flex;
        flex-direction: row-reverse;
        align-items: center;
        border-radius: 0;
        width: 100%;
        justify-content: center;

        & .icon {
          margin: 0 5px 0 0;
        }
      }

      & li {
        /* fixes the scrolling to top selected border cut off problem */
        padding: 1px 0;
      }
    }

    &.display-icon {
      gap: 4px 0;

      & .show-more {
        margin: 20px auto 0;
        display: block;

        & .icon {
          margin: 0;
        }
      }

      & li {
        /* fixes the scrolling to top selected border cut off problem */
        padding: 3px 0;
      }
    }
  }
}
</style>
