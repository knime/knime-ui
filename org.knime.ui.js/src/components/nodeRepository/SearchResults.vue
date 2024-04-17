<script setup lang="ts">
import { ref, computed, watch, toRefs, nextTick } from "vue";

import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";

import ScrollViewContainer from "./ScrollViewContainer.vue";
import NodeList from "./NodeList.vue";
import SearchResultsInfo from "./SearchResultsInfo.vue";
import SkeletonNodes from "@/components/common/skeleton-loader/SkeletonNodes.vue";
import type { NodeRepositoryDisplayModesType } from "@/store/settings";
import { createStaggeredLoader } from "@/util/createStaggeredLoader";

export type SearchActions = {
  searchNodesNextPage: () => Promise<any>;
};

/**
 * Reusable search results. Please keep this store free.
 */
type Props = {
  nodes: NodeTemplateWithExtendedPorts[] | null;
  query: string;
  selectedTags?: string[];
  searchScrollPosition?: number;
  selectedNode: NodeTemplateWithExtendedPorts | null;
  searchActions: SearchActions;
  numFilteredOutNodes: number;
  highlightFirst?: boolean;
  displayMode: NodeRepositoryDisplayModesType;
  showDownloadButton?: boolean;
  isLoadingSearchResults: boolean;
  isQuickAddNodeMenu: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  selectedTags: () => [],
  searchScrollPosition: 0,
  highlightFirst: false,
  displayMode: "icon",
  showDownloadButton: false,
  isQuickAddNodeMenu: false,
});

const emit = defineEmits<{
  (e: "navReachedTop"): void;
  (e: "update:searchScrollPosition", position: number): void;
  (e: "update:selectedNode", value: NodeTemplateWithExtendedPorts | null): void;
  (e: "itemEnterKey", event: KeyboardEvent): void;
}>();

const {
  nodes,
  selectedNode,
  query,
  selectedTags,
  searchActions,
  displayMode,
  isLoadingSearchResults,
} = toRefs(props);

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
  isLoadingSearchResults,
  (value) => {
    setIsLoadingSearchResultsDeferred(value);
  },
  { immediate: true },
);

const isNodeListEmpty = computed(() => nodes.value?.length === 0);
const selectedNodeModel = computed({
  get() {
    return selectedNode.value;
  },
  set(value) {
    emit("update:selectedNode", value);
  },
});
const searchHubLink = computed(
  () =>
    `https://hub.knime.com/search?q=${encodeURIComponent(
      query.value,
    )}&type=all&src=knimeappmodernui`,
);

const onSaveScrollPosition = (position: number) => {
  emit("update:searchScrollPosition", position);
};

const scroller = ref<InstanceType<typeof ScrollViewContainer> | null>(null);
const onSearchChanged = async () => {
  // wait for new content to be displayed, then scroll to top
  await nextTick();
  if (scroller.value) {
    scroller.value.$el.scrollTop = 0;
  }
};

const loadMoreSearchResults = () => {
  setIsLoadingNextPage(true);
  searchActions.value.searchNodesNextPage().then(() => {
    setIsLoadingNextPage(false);
  });
};

const nodeList = ref<InstanceType<typeof NodeList> | null>(null);
const focusFirst = () => {
  nodeList.value?.focusFirst();
};

watch(query, onSearchChanged);
watch(selectedTags, onSearchChanged);

defineExpose({ focusFirst });
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
      <div
        v-if="!isNodeListEmpty && !isLoadingSearchResults"
        class="node-list-wrapper"
      >
        <NodeList
          ref="nodeList"
          v-model:selected-node="selectedNodeModel"
          class="node-list"
          :nodes="nodes!"
          :highlight-first="highlightFirst"
          :display-mode="displayMode"
          @nav-reached-top="emit('navReachedTop')"
          @enter-key="emit('itemEnterKey', $event)"
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

      <SearchResultsInfo
        v-if="!isLoadingSearchResults"
        :num-filtered-out-nodes="numFilteredOutNodes"
        :is-node-list-empty="isNodeListEmpty"
        :show-download-button="showDownloadButton"
        :search-hub-link="searchHubLink"
        :is-quick-add-node-menu="isQuickAddNodeMenu"
      />
    </div>
  </ScrollViewContainer>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.results {
  & .content {
    padding: 0 10px 10px;

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
