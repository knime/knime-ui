<script setup lang="ts">
import { nextTick, ref, toRefs, watch } from "vue";

import ScrollViewContainer from "@/components/common/ScrollViewContainer/ScrollViewContainer.vue";
import { createStaggeredLoader } from "@/util/createStaggeredLoader";

type Props = {
  isLoading: boolean;
  fetchMore: () => Promise<any>;
};
const props = defineProps<Props>();

const searchScrollPosition = defineModel<number>({ default: 0 });

const { isLoading } = toRefs(props);

const isLoadingNextPage = ref(false);
const isLoadingSearchResultsDeferred = ref(false);

const setIsLoadingNextPage = createStaggeredLoader({
  firstStageCallback: () => {
    isLoadingNextPage.value = true;
  },
  resetCallback: () => {
    isLoadingNextPage.value = false;
  },
});

const setIsLoadingSearchResultsDeferred = createStaggeredLoader({
  firstStageCallback: () => {
    isLoadingSearchResultsDeferred.value = true;
  },
  resetCallback: () => {
    isLoadingSearchResultsDeferred.value = false;
  },
});

watch(
  isLoading,
  (value) => {
    setIsLoadingSearchResultsDeferred(value);
  },
  { immediate: true },
);

const onSaveScrollPosition = (position: number) => {
  searchScrollPosition.value = position;
};

const scroller = ref<InstanceType<typeof ScrollViewContainer> | null>(null);
const scrollToTop = async () => {
  // wait for new content to be displayed, then scroll to top
  await nextTick();
  if (scroller.value) {
    scroller.value.$el.scrollTop = 0;
  }
};

const loadMoreSearchResults = async () => {
  setIsLoadingNextPage(true);
  await props.fetchMore();
  setIsLoadingNextPage(false);
};

defineExpose({ scrollToTop });
</script>

<template>
  <ScrollViewContainer
    ref="scroller"
    class="results"
    :initial-position="searchScrollPosition"
    @save-position="onSaveScrollPosition"
    @scroll-bottom="loadMoreSearchResults"
  >
    <div class="content">
      <slot
        :is-loading-next-page="isLoadingNextPage"
        :is-loading-search-results-deferred="isLoadingSearchResultsDeferred"
      />
    </div>
  </ScrollViewContainer>
</template>

<style lang="postcss" scoped>
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
