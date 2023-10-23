<script setup lang="ts">
import { computed, ref, toRefs, watch, nextTick } from "vue";
import ReloadIcon from "webapps-common/ui/assets/img/icons/reload.svg";

import type { NodeTemplate } from "@/api/gateway-api/generated-api";
import type { KnimeNode } from "@/api/custom-types";

import ScrollViewContainer from "./ScrollViewContainer.vue";
import NodeList from "./NodeList.vue";

export type SearchActions = {
  searchTopNodesNextPage: () => Promise<any>;
  searchBottomNodesNextPage: () => Promise<any>;
  toggleShowingBottomNodes: () => Promise<any>;
};

/**
 * Reusable search results. Please keep this store free.
 */
type Props = {
  topNodes: NodeTemplate[] | null;
  bottomNodes: NodeTemplate[] | null;
  query: string;
  selectedTags?: string[];
  searchScrollPosition?: number;
  isShowingBottomNodes: boolean;
  selectedNode: KnimeNode | null;
  searchActions: SearchActions;
  hasNodeCollectionActive: boolean;
  highlightFirst?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  selectedTags: () => [],
  searchScrollPosition: 0,
});

const emit = defineEmits<{
  (e: "navReachedTop"): void;
  (e: "update:searchScrollPosition", position: number): void;
  (e: "update:selectedNode", value: any): void;
  (e: "item-enter-key", event: KeyboardEvent): void;
}>();

let isLoading = ref(false);
const isLoadingMore = ref(false);
const {
  topNodes,
  bottomNodes,
  query,
  selectedTags,
  searchActions,
  isShowingBottomNodes,
  selectedNode,
} = toRefs(props);

const isTopListEmpty = computed(() => topNodes?.value.length === 0);

const allNodes = computed(() => [
  ...topNodes.value,
  ...(bottomNodes.value ? bottomNodes.value : []),
]);

const selectedNodeModel = computed({
  get() {
    return selectedNode;
  },
  set(value) {
    emit("update:selectedNode", value);
  },
});

const onSaveScrollPosition = (position: number) => {
  emit("update:searchScrollPosition", position);
};

const scroller: InstanceType<typeof ScrollViewContainer> = null;
const onSearchChanged = async () => {
  // wait for new content to be displayed, then scroll to top
  await nextTick();
  if (scroller) {
    scroller.$el.scrollTop = 0;
  }
};

watch(query, () => onSearchChanged, { immediate: true });
watch(selectedTags, () => onSearchChanged, { immediate: true });

const loadMoreSearchResults = () => {
  isLoading.value = true;
  searchActions.value.searchTopNodesNextPage().then(() => {
    isLoading.value = false;
  });

  // NB: The store will only load more nodes if isShowingBottomNodes is true
  isLoadingMore.value = true;
  searchActions.value.searchBottomNodesNextPage().then(() => {
    isLoadingMore.value = false;
  });
};

const bottomList: InstanceType<typeof NodeList> = null;
const openBottomNodesAndFocusFirst = async () => {
  if (!isShowingBottomNodes.value) {
    await searchActions.value.toggleShowingBottomNodes();
  }
  await nextTick();
  bottomList?.focusFirst();
};

const topList: InstanceType<typeof NodeList> = null;
const focusFirst = () => {
  if (topNodes.value.length > 0) {
    topList?.focusFirst();
    return;
  }
  openBottomNodesAndFocusFirst();
};

defineExpose({ focusFirst });
// @input="$emit('update:selectedNode', $event.target.value)"
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
      <div v-if="isTopListEmpty" class="no-matching-search">
        No node matching for: {{ query }}
      </div>
      <div v-else class="node-list-wrapper">
        <NodeList
          ref="topList"
          v-model:selected-node="selectedNodeModel"
          :nodes="allNodes"
          :highlight-first="highlightFirst"
          @nav-reached-top="$emit('navReachedTop')"
          @nav-reached-end="openBottomNodesAndFocusFirst"
          @enter-key="$emit('item-enter-key', $event)"
        >
          <template #item="slotProps">
            <slot name="topNodeTemplate" v-bind="slotProps" />
          </template>
        </NodeList>
        <ReloadIcon v-if="isLoading" class="loading-indicator" />
      </div>
    </div>
  </ScrollViewContainer>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

@keyframes spin {
  100% {
    transform: rotate(-360deg);
  }
}

.no-matching-search {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  height: 100%;
  font-style: italic;
  color: var(--knime-dove-gray);
  flex-direction: column;
  margin-top: 30px;
  margin-bottom: 15px;
}

.results {
  & :deep(ul.nodes) {
    margin-left: 8px;
    margin-right: 8px;
  }

  & .content {
    padding: 0 10px 10px;

    & .node-list-wrapper {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    & .loading-indicator {
      @mixin svg-icon-size 40;

      animation: spin 2s linear infinite;
      stroke: var(--knime-masala);
      align-self: center;
    }

    & .advanced-buttons {
      width: 100%;
      display: flex;
      justify-content: center;

      & .more-nodes-button {
        border: 0;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;

        & .more-nodes-dropdown {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;

          & .dropdown-icon {
            margin: auto;
            width: 18px;
            height: 18px;
            stroke-width: calc(32px / 18);
            stroke: var(--knime-masala);

            &.flip {
              transform: scaleY(-1);
            }
          }

          &:hover {
            background-color: var(
              --theme-button-function-background-color-hover
            );
          }
        }
      }

      & .preferences-button {
        width: 30px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;

        & svg {
          @mixin svg-icon-size 18;

          stroke: var(--knime-masala);
        }
      }

      &::after,
      &::before {
        content: "";
        flex: 1 1;
        border-bottom: 1px solid var(--knime-silver-sand);
        transform: translateY(-50%);
      }

      &::after {
        margin-left: 10px;
      }
    }
  }
}
</style>
