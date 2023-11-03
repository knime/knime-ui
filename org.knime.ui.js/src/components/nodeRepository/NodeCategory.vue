<script>
import DraggableNodeTemplate from "@/components/nodeRepository/DraggableNodeTemplate.vue";

import NodeList from "./NodeList.vue";

const CATEGORY_LIMIT = 8;

export default {
  components: {
    DraggableNodeTemplate,
    NodeList,
  },
  props: {
    tag: {
      type: String,
      required: true,
    },
    nodes: {
      type: Array,
      default: () => [],
    },
    displayMode: {
      type: String,
      default: "icon",
    },
    selectedNode: {
      type: [Object, null],
      required: true,
    },
  },
  emits: ["selectTag", "showNodeDescription"],
  computed: {
    hasMoreNodes() {
      return this.nodes.length >= CATEGORY_LIMIT;
    },
  },
};
</script>

<template>
  <div :class="['category', `display-${displayMode}`]">
    <div>
      <span class="category-title" @click="$emit('selectTag', tag)">
        {{ tag }}
      </span>
      <hr />
    </div>
    <NodeList
      :nodes="nodes"
      class="category-node-list"
      :has-more-nodes="hasMoreNodes"
      :selected-node="selectedNode"
      :display-mode="displayMode"
      @show-more="$emit('selectTag', tag)"
    >
      <template #item="itemProps">
        <DraggableNodeTemplate
          v-bind="itemProps"
          @show-node-description="$emit('showNodeDescription', itemProps)"
        />
      </template>
      <template #more-button>Show all</template>
    </NodeList>
  </div>
</template>

<style lang="postcss" scoped>
.category {
  &.display-list {
    & .category-node-list {
      padding-top: 5px;
    }
  }

  & div {
    display: flex;
    align-items: center;

    & .category-title {
      border: 1px solid var(--knime-silver-sand);
      margin: 0 5px 0 0;
      padding: 3px 5px;
      line-height: 15px;
      display: inline-block;
      font-size: 13px;
      color: var(--knime-dove-gray);
      cursor: pointer;
      position: relative;
      background-color: var(--knime-porcelain);

      &:hover {
        color: var(--knime-white);
        background-color: var(--knime-dove-gray);
        border-color: var(--knime-dove-gray);
      }

      &:active {
        color: var(--knime-white);
        background-color: var(--knime-masala);
        border-color: var(--knime-masala);
      }
    }

    & hr {
      flex: 1;
      border: 0;
      border-top: 1px solid var(--knime-silver-sand);
    }
  }
}
</style>
