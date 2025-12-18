<script setup lang="ts">
import { toRef, watch } from "vue";
import { storeToRefs } from "pinia";

import InfiniteNodeList from "@/components/common/NodeList/InfiniteNodeList.vue";
import { useComponentSearchStore } from "@/store/componentSearch";
import DraggableNodeTemplate from "../common/NodeTemplate/DraggableNodeTemplate.vue";

type Props = {
  active: boolean;
};
const props = defineProps<Props>();

const componentSearchStore = useComponentSearchStore();
const { isLoading, hasLoaded, results, searchScrollPosition } =
  storeToRefs(componentSearchStore);

watch(toRef(props, "active"), () => {
  if (props.active && !hasLoaded.value) {
    componentSearchStore.searchComponents();
  }
});
</script>

<template>
  <InfiniteNodeList
    ref="infiniteList"
    v-model:scroll-position="searchScrollPosition"
    :nodes="results"
    :fetch-more="() => componentSearchStore.searchComponents({ append: true })!"
    :is-loading-search-results="isLoading"
  >
    <template #nodesTemplate="slotProps">
      <DraggableNodeTemplate v-bind="slotProps" />
    </template>

    <template #noResults> There are no components </template>
  </InfiniteNodeList>
</template>
