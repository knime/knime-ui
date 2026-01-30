<script setup lang="ts" generic="T extends ListItem">
import { computed, toRefs, useTemplateRef } from "vue";

import InfiniteLoadingList from "@/components/common/InfiniteLoadingList/InfiniteLoadingList.vue";
import SkeletonNodes from "@/components/common/skeleton-loader/SkeletonNodes.vue";
import type { NodeRepositoryDisplayModesType } from "@/store/settings";

import NodeList from "./NodeList.vue";
import type { ListItem, NavReachedEvent } from "./types";

type Props = {
  nodes: T[];
  fetchMore: () => Promise<void>;
  showDetailsFor?: T | null;
  highlightFirst?: boolean;
  displayMode?: Exclude<NodeRepositoryDisplayModesType, "tree">;
  isLoading: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  highlightFirst: false,
  displayMode: "icon",
  showDetailsFor: null,
});

const showDetailsFor = computed<T | null>(() => props.showDetailsFor ?? null);

const scrollPosition = defineModel<number>("scrollPosition");
const selectedNode = defineModel<T | null>("selectedNode", {
  default: null,
});

const emit = defineEmits<{
  navReachedTop: [event: NavReachedEvent];
  itemEnterKey: [node: T];
  showNodeDetails: [node: T];
}>();

const { nodes, displayMode, isLoading } = toRefs(props);

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
    :is-loading="isLoading"
    :fetch-more="fetchMore"
  >
    <template #default="{ isLoadingNextPage, isLoadingDeferred }">
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
        v-if="isLoadingDeferred"
        class="node-list-skeleton"
        :number-of-nodes="5"
        :display-mode="displayMode"
      />

      <slot
        name="listBottom"
        :is-empty="isEmpty"
        :is-loading="isLoading"
        :is-loading-deferred="isLoadingDeferred"
        :is-loading-next-page="isLoadingNextPage"
      />
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
