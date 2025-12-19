<script setup lang="ts">
import { toRef, useTemplateRef, watch } from "vue";
import { storeToRefs } from "pinia";

import InfiniteNodeList from "@/components/common/NodeList/InfiniteNodeList.vue";
import { useComponentSearchStore } from "@/store/componentSearch";
import type { NavReachedEvent } from "../common/NodeList/NodeList.vue";
import DraggableNodeTemplate from "../common/NodeTemplate/DraggableNodeTemplate.vue";

type Props = {
  active: boolean;
};
const props = defineProps<Props>();

const emit = defineEmits<{
  navReachedTop: [event: NavReachedEvent];
}>();

const componentSearchStore = useComponentSearchStore();
const { isLoading, hasLoaded, results, searchScrollPosition } =
  storeToRefs(componentSearchStore);

watch(toRef(props, "active"), () => {
  if (props.active && !hasLoaded.value) {
    componentSearchStore.searchComponents();
  }
});

const infiniteList = useTemplateRef("infiniteList");
const focusFirst = () => {
  infiniteList.value?.focusFirst();
};
defineExpose({ focusFirst });
</script>

<template>
  <InfiniteNodeList
    ref="infiniteList"
    v-model:scroll-position="searchScrollPosition"
    :nodes="results"
    :fetch-more="() => componentSearchStore.searchComponents({ append: true })!"
    :is-loading="isLoading"
    @nav-reached-top="emit('navReachedTop', $event)"
  >
    <template #nodesTemplate="slotProps">
      <DraggableNodeTemplate v-bind="slotProps" />
    </template>

    <template #listBottom="{ isEmpty }">
      <div v-if="isEmpty && !isLoading" class="empty-state">
        No results were found. Please try a different search term.
      </div>
    </template>
  </InfiniteNodeList>
</template>

<style lang="postcss" scoped>
.empty-state {
  display: flex;
  justify-content: center;
  padding: var(--space-32) var(--space-8);
  font-size: 13px;
  text-align: center;
}
</style>
