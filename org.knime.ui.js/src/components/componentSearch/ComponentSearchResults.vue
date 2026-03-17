<script setup lang="ts">
import { toRef, useTemplateRef, watch } from "vue";

import {
  InfiniteNodeList,
  type NavReachedEvent,
} from "@/components/nodeTemplates";
import type { ComponentNodeTemplateWithExtendedPorts } from "@/lib/data-mappers";

type Props = {
  active: boolean;
  isLoading: boolean;
  hasLoaded: boolean;
  results: ComponentNodeTemplateWithExtendedPorts[];
  fetchData: (params: { append: boolean }) => Promise<void>;
  showDescriptionForComponent?: ComponentNodeTemplateWithExtendedPorts;
};
const props = defineProps<Props>();

const emit = defineEmits<{
  navReachedTop: [event: NavReachedEvent];
  onEnterKey: [event: ComponentNodeTemplateWithExtendedPorts];
  showComponentDetails: [node: ComponentNodeTemplateWithExtendedPorts];
}>();

watch(
  toRef(props, "active"),
  () => {
    if (props.active && !props.hasLoaded) {
      props.fetchData({ append: false });
    }
  },
  { immediate: true },
);

const infiniteList = useTemplateRef("infiniteList");
const focusFirst = () => {
  infiniteList.value?.focusFirst();
};

defineExpose({ focusFirst });
</script>

<template>
  <InfiniteNodeList
    ref="infiniteList"
    :nodes="results"
    :fetch-more="() => fetchData({ append: true })"
    :is-loading="isLoading"
    :show-details-for="showDescriptionForComponent"
    @nav-reached-top="emit('navReachedTop', $event)"
    @item-enter-key="$emit('onEnterKey', $event)"
  >
    <template #nodesTemplate="slotProps">
      <slot name="nodesTemplate" v-bind="slotProps" />
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
