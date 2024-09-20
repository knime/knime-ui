<script lang="ts">
import { Tag } from "@knime/components";
import DraggableNodeTemplate from "@/components/nodeRepository/DraggableNodeTemplate.vue";

import NodeList, { type NavReachedEvent } from "./NodeList.vue";
import { defineComponent, type PropType } from "vue";
import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";
import type { NodeRepositoryDisplayModesType } from "@/store/settings";

const TAG_LIMIT = 8;

export default defineComponent({
  components: {
    DraggableNodeTemplate,
    NodeList,
    Tag,
  },
  props: {
    tag: {
      type: String,
      required: true,
    },
    nodes: {
      type: Array as PropType<NodeTemplateWithExtendedPorts[]>,
      default: () => [],
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
  },
  expose: ["focusFirst", "focusLast"],
  emits: [
    "selectTag",
    "showNodeDescription",
    "update:selectedNode",
    "itemEnterKey",
    "helpKey",
    "navReachedEnd",
    "navReachedTop",
  ],
  computed: {
    hasMoreNodes() {
      return this.nodes.length >= TAG_LIMIT;
    },
  },
  methods: {
    focusFirst(navReached?: NavReachedEvent) {
      const nodeList = this.$refs.nodeList as InstanceType<typeof NodeList>;
      nodeList?.focusFirst(navReached);
    },
    focusLast(navReached?: NavReachedEvent) {
      const nodeList = this.$refs.nodeList as InstanceType<typeof NodeList>;
      nodeList?.focusLast(navReached);
    },
  },
});
</script>

<template>
  <div :class="['grouped-by-tags', `display-${displayMode}`]">
    <div class="tag-header-line">
      <Tag class="tag" clickable @click="$emit('selectTag', tag)">{{
        tag
      }}</Tag>
      <hr />
    </div>
    <NodeList
      ref="nodeList"
      :nodes="nodes"
      class="tag-node-list"
      :has-more-nodes="hasMoreNodes"
      :selected-node="selectedNode"
      :show-description-for-node="showDescriptionForNode"
      :display-mode="displayMode"
      @show-more="$emit('selectTag', tag)"
      @update:selected-node="$emit('update:selectedNode', $event)"
      @enter-key="$emit('itemEnterKey', $event)"
      @help-key="$emit('helpKey', $event)"
      @nav-reached-top="$emit('navReachedTop', $event)"
      @nav-reached-end="$emit('navReachedEnd', $event)"
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
.grouped-by-tags {
  &.node-template-list-mode {
    & .tag-node-list {
      padding-top: var(--space-4);
    }
  }

  & .tag {
    margin-bottom: 0;
    height: var(--space-24);
  }

  & .tag-header-line {
    display: flex;
    align-items: center;
  }

  & hr {
    flex: 1;
    border: 0;
    border-top: 1px solid var(--knime-silver-sand);
  }
}
</style>
