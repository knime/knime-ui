<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";
import BaseButton from "webapps-common/ui/components/BaseButton.vue";
import DropdownIcon from "webapps-common/ui/assets/img/icons/arrow-dropdown.svg";
import ReloadIcon from "webapps-common/ui/assets/img/icons/reload.svg";
import FunctionButton from "webapps-common/ui/components/FunctionButton.vue";
import CogIcon from "webapps-common/ui/assets/img/icons/cog.svg";

import { API } from "@api";
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
    BaseButton,
    DropdownIcon,
    FunctionButton,
    CogIcon,
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
  ],
  expose: ["focusFirst"],
  data() {
    return {
      isLoading: false,
      isLoadingMore: false,
    };
  },
  computed: {
    isTopListEmpty() {
      return this.topNodes?.length === 0;
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
      this.isLoading = true;
      this.searchActions.searchTopNodesNextPage().then(() => {
        this.isLoading = false;
      });

      // NB: The store will only load more nodes if isShowingBottomNodes is true
      this.isLoadingMore = true;
      this.searchActions.searchBottomNodesNextPage().then(() => {
        this.isLoadingMore = false;
      });
    },
    async openBottomNodesAndFocusFirst() {
      if (!this.isShowingBottomNodes) {
        await this.searchActions.toggleShowingBottomNodes();
      }
      await this.$nextTick();
      const bottomList = this.$refs.bottomList as InstanceType<typeof NodeList>;
      bottomList?.focusFirst();
    },
    focusFirst() {
      const topList = this.$refs.topList as InstanceType<typeof NodeList>;
      if (this.topNodes.length > 0) {
        topList?.focusFirst();
        return;
      }
      this.openBottomNodesAndFocusFirst();
    },
    bottomListNavReachedTop() {
      const topList = this.$refs.topList as InstanceType<typeof NodeList>;
      if (this.topNodes.length > 0) {
        topList?.focusLast();
      } else {
        this.$emit("navReachedTop");
      }
    },
    openKnimeUIPreferencePage() {
      API.desktop.openWebUIPreferencePage();
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
      <div v-if="isTopListEmpty" class="no-matching-search">
        No node matching for: {{ query }}
      </div>
      <div v-else class="node-list-wrapper">
        <NodeList
          ref="topList"
          v-model:selected-node="selectedNodeModel"
          :nodes="topNodes"
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
    <div v-if="hasNodeCollectionActive" class="content">
      <div class="advanced-buttons">
        <BaseButton
          class="more-nodes-button"
          :aria-expanded="String(isShowingBottomNodes)"
          @click.prevent="searchActions.toggleShowingBottomNodes"
        >
          <div class="more-nodes-dropdown">
            <DropdownIcon
              :class="['dropdown-icon', { flip: isShowingBottomNodes }]"
            />
          </div>
          More advanced nodes
        </BaseButton>
        <FunctionButton
          class="preferences-button"
          title="Set up nodes in the node repo"
          data-testid="open-preferences"
          @click="openKnimeUIPreferencePage"
        >
          <CogIcon />
        </FunctionButton>
      </div>
      <div v-show="isShowingBottomNodes">
        <div v-if="hasNoMoreSearchResults" class="no-matching-search">
          No additional node matching for: {{ query }}
        </div>
        <div v-else class="node-list-wrapper">
          <NodeList
            ref="bottomList"
            v-model:selected-node="selectedNodeModel"
            :highlight-first="isTopListEmpty ? highlightFirst : false"
            :nodes="bottomNodes"
            @nav-reached-top="bottomListNavReachedTop"
            @enter-key="$emit('item-enter-key', $event)"
          >
            <template #item="slotProps">
              <slot name="bottomNodeTemplate" v-bind="slotProps" />
            </template>
          </NodeList>
          <ReloadIcon v-if="isLoadingMore" class="loading-indicator" />
        </div>
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
  color: var(--buttons-button-tertiary);
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
