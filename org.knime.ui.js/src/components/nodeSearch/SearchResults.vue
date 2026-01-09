<script setup lang="ts">
import { computed, toRefs, useTemplateRef, watch } from "vue";

import { type NavReachedEvent } from "@/components/common/NodeList/NodeList.vue";
import { knimeExternalUrls } from "@/plugins/knimeExternalUrls";
import type { NodeRepositoryDisplayModesType } from "@/store/settings";
import type { NodeTemplateWithExtendedPorts } from "@/util/data-mappers";
import InfiniteNodeList from "../common/NodeList/InfiniteNodeList.vue";

import SearchResultsInfo from "./SearchResultsInfo.vue";

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
  showDescriptionForNode?: NodeTemplateWithExtendedPorts | null;
  searchActions: SearchActions;
  numFilteredOutNodes: number;
  highlightFirst?: boolean;
  displayMode?: Exclude<NodeRepositoryDisplayModesType, "tree">;
  isLoadingSearchResults: boolean;
  isQuickAddNodeMenu?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  selectedTags: () => [],
  highlightFirst: false,
  displayMode: "icon",
  isQuickAddNodeMenu: false,
  showDescriptionForNode: null,
});

const emit = defineEmits<{
  navReachedTop: [event: NavReachedEvent];
  itemEnterKey: [node: NodeTemplateWithExtendedPorts];
  showNodeDetails: [node: NodeTemplateWithExtendedPorts];
}>();

const {
  nodes,
  query,
  selectedTags,
  searchActions,
  displayMode,
  isLoadingSearchResults,
} = toRefs(props);

const { KNIME_HUB_SEARCH_URL } = knimeExternalUrls;

const scrollPosition = defineModel<number>("scrollPosition", { default: 0 });
const selectedNode = defineModel<NodeTemplateWithExtendedPorts | null>(
  "selectedNode",
  { default: null },
);

const searchHubLink = computed(() =>
  KNIME_HUB_SEARCH_URL.replace("%s", encodeURIComponent(query.value)),
);

const infiniteList = useTemplateRef("infiniteList");

const onSearchChanged = async () => {
  await infiniteList.value?.scrollToTop();
};
watch(query, onSearchChanged);
watch(selectedTags, onSearchChanged);

const focusFirst = () => {
  infiniteList.value?.focusFirst();
};

defineExpose({ focusFirst });
</script>

<template>
  <InfiniteNodeList
    ref="infiniteList"
    v-model:selected-node="selectedNode"
    v-model:scroll-position="scrollPosition"
    :nodes="nodes ?? []"
    :highlight-first="highlightFirst"
    :display-mode="displayMode"
    :show-details-for="showDescriptionForNode"
    :fetch-more="searchActions.searchNodesNextPage"
    :is-loading="isLoadingSearchResults"
    @nav-reached-top="emit('navReachedTop', $event)"
    @item-enter-key="emit('itemEnterKey', $event)"
    @show-node-details="emit('showNodeDetails', $event)"
  >
    <template #nodesTemplate="slotProps">
      <slot name="nodesTemplate" v-bind="slotProps" />
    </template>

    <template #listBottom="{ isEmpty, isLoading }">
      <SearchResultsInfo
        v-if="!isLoading"
        :num-filtered-out-nodes="numFilteredOutNodes"
        :is-node-list-empty="isEmpty"
        :search-hub-link="searchHubLink"
        :mini="isQuickAddNodeMenu"
      />
    </template>
  </InfiniteNodeList>
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
