<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";
import ReloadIcon from "webapps-common/ui/assets/img/icons/reload.svg";
import CircleInfoIcon from "webapps-common/ui/assets/img/icons/circle-info.svg";

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
export default defineComponent({
  components: {
    ScrollViewContainer,
    NodeList,
    ReloadIcon,
    CircleInfoIcon,
  },
  props: {
    topNodes: {
      type: [Array, null] as PropType<Array<NodeTemplate> | null>,
      required: true,
    },
    bottomNodes: {
      type: [Array, null] as PropType<Array<NodeTemplate> | null>,
      required: true,
    },
    query: {
      type: String,
      required: true,
    },
    selectedTags: {
      type: Array as PropType<Array<string>>,
      default: () => [],
    },
    searchScrollPosition: {
      type: Number,
      default: 0,
    },
    isShowingBottomNodes: {
      type: Boolean,
      required: true,
    },
    selectedNode: {
      type: [Object, null] as PropType<KnimeNode | null>,
      required: true,
    },
    searchActions: {
      type: Object as PropType<SearchActions>,
      required: true,
    },
    hasNodeCollectionActive: {
      type: Boolean,
      required: true,
    },
    highlightFirst: {
      type: Boolean,
      default: false,
    },
  },
  emits: [
    "navReachedTop",
    "update:searchScrollPosition",
    "update:selectedNode",
    "item-enter-key",
    "open-preferences",
  ],
  expose: ["focusFirst"],
  data() {
    return {
      isLoading: false,
      isLoadingMore: false,
    };
  },
  computed: {
    isStarterListEmpty() {
      return this.topNodes?.length === 0;
    },
    isAllNodesListEmpty() {
      return this.bottomNodes?.length === 0;
    },
    hasNoMoreSearchResults() {
      // NB: If bottomNodes is null the results are still loading
      return this.bottomNodes !== null && this.bottomNodes.length === 0;
    },
    selectedNodeModel: {
      get() {
        return this.selectedNode;
      },
      set(value) {
        this.$emit("update:selectedNode", value);
      },
    },
  },
  watch: {
    query() {
      this.onSearchChanged();
    },
    selectedTags() {
      this.onSearchChanged();
    },
  },
  methods: {
    // Also currently the NodeRepository isn't destroyed upon closing
    onSaveScrollPosition(position: number) {
      this.$emit("update:searchScrollPosition", position);
    },
    async onSearchChanged() {
      let scroller = this.$refs.scroller as InstanceType<
        typeof ScrollViewContainer
      >;

      // wait for new content to be displayed, then scroll to top
      await this.$nextTick();
      if (scroller) {
        scroller.$el.scrollTop = 0;
      }
    },
    loadMoreSearchResults() {
      if (this.hasNodeCollectionActive) {
        this.isLoading = true;
        this.searchActions.searchTopNodesNextPage().then(() => {
          this.isLoading = false;
        });
        return;
      }

      this.isLoadingMore = true;
      this.searchActions.searchBottomNodesNextPage().then(() => {
        this.isLoadingMore = false;
      });
    },
    focusFirst() {
      const nodeList = this.$refs.nodeList as InstanceType<typeof NodeList>;
      nodeList?.focusFirst();
    },
  },
});
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
        v-if="isStarterListEmpty || isAllNodesListEmpty"
        class="no-matching-search"
      >
        <span v-if="isStarterListEmpty">
          There are no nodes matching with your current filter settings.
        </span>
        <span v-else> There are no matching nodes. </span>
        <div class="search-info">
          <CircleInfoIcon class="info-icon" />
          <span v-if="isStarterListEmpty"
            >But there are some in “All nodes“. <br />Change the
            <a class="search-link" @click="$emit('open-preferences')"
              >filter settings</a
            >
            to see all nodes.</span
          >
          <span v-else
            >Search the
            <a
              class="search-link"
              :href="`https://hub.knime.com/search?q=${encodeURIComponent(
                query,
              )}&type=all`"
              >KNIME Community Hub</a
            >
            to find more nodes and extensions.</span
          >
        </div>
      </div>
      <div class="node-list-wrapper">
        <NodeList
          ref="nodeList"
          v-model:selected-node="selectedNodeModel"
          :nodes="topNodes ? topNodes : bottomNodes"
          :highlight-first="highlightFirst"
          @nav-reached-top="$emit('navReachedTop')"
          @enter-key="$emit('item-enter-key', $event)"
        >
          <template #item="slotProps">
            <slot name="nodesTemplate" v-bind="slotProps" />
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
  justify-content: center;
  align-items: flex-start;
  height: 100%;
  font-style: italic;
  color: var(--knime-masala);
  flex-direction: column;
  margin-top: 30px;
  margin-bottom: 15px;
  padding: 0 10px;

  & .search-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 20px;
    width: 100%;

    & .info-icon {
      @mixin svg-icon-size 20;

      stroke: var(--knime-masala);
      width: 30px;
      margin-right: 10px;
    }

    & .search-link {
      color: var(--knime-dove-gray);
      text-decoration: underline;
    }
  }
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
