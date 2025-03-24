<script setup lang="ts">
import { computed, ref } from "vue";

import { Tag } from "@knime/components";

import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";
import DraggableNodeTemplate from "@/components/nodeRepository/DraggableNodeTemplate.vue";
import type { NodeRepositoryDisplayModesType } from "@/store/settings";

import NodeList, { type NavReachedEvent } from "./NodeList.vue";

const TAG_LIMIT = 8;

interface Props {
  tag: string;
  nodes?: NodeTemplateWithExtendedPorts[];
  displayMode?: NodeRepositoryDisplayModesType;
  selectedNode?: NodeTemplateWithExtendedPorts | null;
  showDescriptionForNode?: NodeTemplateWithExtendedPorts | null;
}

const props = withDefaults(defineProps<Props>(), {
  nodes: () => [],
  displayMode: "icon",
  selectedNode: null,
  showDescriptionForNode: null,
});

defineEmits<{
  selectTag: [tag: string];
  showNodeDescription: [
    payload: {
      nodeTemplate: NodeTemplateWithExtendedPorts;
      isHighlighted: boolean;
      isSelected: boolean;
      isDescriptionActive: boolean;
      displayMode: NodeRepositoryDisplayModesType;
    },
  ];
  "update:selectedNode": [node: NodeTemplateWithExtendedPorts | null];
  itemEnterKey: [node: NodeTemplateWithExtendedPorts];
  helpKey: [node: NodeTemplateWithExtendedPorts];
  navReachedEnd: [event: NavReachedEvent];
  navReachedTop: [event: NavReachedEvent];
}>();

const nodeList = ref<InstanceType<typeof NodeList>>();

const hasMoreNodes = computed(() => props.nodes.length >= TAG_LIMIT);

const focusFirst = (navReached?: NavReachedEvent) => {
  nodeList.value?.focusFirst(navReached);
};

const focusLast = (navReached?: NavReachedEvent) => {
  nodeList.value?.focusLast(navReached);
};

defineExpose({
  focusFirst,
  focusLast,
});
</script>

<template>
  <div
    :data-test-id="tag"
    :class="['grouped-by-tags', `display-${displayMode}`]"
  >
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
