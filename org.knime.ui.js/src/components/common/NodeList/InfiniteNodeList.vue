<script setup lang="ts">
import { computed, toRefs, useTemplateRef } from "vue";

import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";
import InfiniteLoadingList from "@/components/common/InfiniteLoadingList/InfiniteLoadingList.vue";
import NodeList, {
  type NavReachedEvent,
} from "@/components/common/NodeList/NodeList.vue";
import SkeletonNodes from "@/components/common/skeleton-loader/SkeletonNodes.vue";
import type { NodeRepositoryDisplayModesType } from "@/store/settings";

type Props = {
  nodes: NodeTemplateWithExtendedPorts[];
  fetchMore: () => Promise<void>;
  showDetailsFor?: NodeTemplateWithExtendedPorts | null;
  highlightFirst?: boolean;
  displayMode?: Exclude<NodeRepositoryDisplayModesType, "tree">;
  isLoadingSearchResults: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  searchScrollPosition: 0,
  highlightFirst: false,
  displayMode: "icon",
  showDetailsFor: null,
});

const scrollPosition = defineModel<number>("scrollPosition");
const selectedNode = defineModel<NodeTemplateWithExtendedPorts | null>(
  "selectedNode",
  { default: null },
);

const emit = defineEmits<{
  navReachedTop: [event: NavReachedEvent];
  itemEnterKey: [node: NodeTemplateWithExtendedPorts];
  showNodeDetails: [node: NodeTemplateWithExtendedPorts];
}>();

const { nodes, displayMode, isLoadingSearchResults } = toRefs(props);

const isEmpty = computed(() => nodes.value?.length === 0);

const infiniteList = useTemplateRef("infiniteList");
const scrollToTop = async () => {
  await infiniteList.value?.scrollToTop();
};

const nodeList = useTemplateRef("nodeList");
const focusFirst = () => {
  nodeList.value?.focusFirst();
};

defineExpose({ focusFirst, scrollToTop });
</script>

<template>
  <InfiniteLoadingList
    ref="infiniteList"
    v-model="scrollPosition"
    :is-loading="isLoadingSearchResults"
    :fetch-more="fetchMore"
  >
    <template #default="{ isLoadingNextPage, isLoadingSearchResultsDeferred }">
      <div v-if="!isEmpty" class="node-list-wrapper">
        <NodeList
          ref="nodeList"
          v-model:selected-node="selectedNode"
          class="node-list"
          :nodes="nodes!"
          :highlight-first="highlightFirst"
          :display-mode="displayMode"
          :show-details-for="showDetailsFor"
          @nav-reached-top="emit('navReachedTop', $event)"
          @enter-key="emit('itemEnterKey', $event)"
          @show-node-details="emit('showNodeDetails', $event)"
        >
          <template #item="slotProps">
            <slot name="nodesTemplate" v-bind="slotProps" />
          </template>
        </NodeList>

        <SkeletonNodes
          v-if="isLoadingNextPage"
          class="node-list-skeleton"
          :number-of-nodes="5"
          :display-mode="displayMode"
        />
      </div>

      <SkeletonNodes
        v-if="isLoadingSearchResultsDeferred"
        class="node-list-skeleton"
        :number-of-nodes="5"
        :display-mode="displayMode"
      />

      <slot v-if="!isLoadingSearchResults" name="noResults" />
    </template>
  </InfiniteLoadingList>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.results {
  & .content {
    padding: 0 var(--space-16) var(--space-16);

    & .node-list {
      margin-bottom: -11px;
    }

    & .node-list-skeleton {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-start;
    }
  }
}
</style>
