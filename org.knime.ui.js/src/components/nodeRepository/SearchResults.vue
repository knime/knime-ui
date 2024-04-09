<script setup lang="ts">
import { ref, computed, watch, toRefs, nextTick } from "vue";
import ReloadIcon from "webapps-common/ui/assets/img/icons/reload.svg";
import CircleInfoIcon from "webapps-common/ui/assets/img/icons/circle-info.svg";
import FilterCheckIcon from "webapps-common/ui/assets/img/icons/filter-check.svg";
import Button from "webapps-common/ui/components/Button.vue";

import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";

import ScrollViewContainer from "./ScrollViewContainer.vue";
import NodeList from "./NodeList.vue";
import DownloadAPButton from "@/components/common/DownloadAPButton.vue";
import type { NodeRepositoryDisplayModesType } from "@/store/settings";
import { isDesktop } from "@/environment";

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
};

const props = withDefaults(defineProps<Props>(), {
  selectedTags: () => [],
  searchScrollPosition: 0,
  highlightFirst: false,
  displayMode: "icon",
  showDownloadButton: false,
});

const emit = defineEmits<{
  (e: "navReachedTop"): void;
  (e: "update:searchScrollPosition", position: number): void;
  (e: "update:selectedNode", value: NodeTemplateWithExtendedPorts | null): void;
  (e: "itemEnterKey", event: KeyboardEvent): void;
  (e: "openPreferences"): void;
}>();

const { nodes, selectedNode, query, selectedTags, searchActions } =
  toRefs(props);

let isLoading = ref(false);

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
  isLoading.value = true;
  searchActions.value.searchNodesNextPage().then(() => {
    isLoading.value = false;
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
      <div v-if="!isNodeListEmpty" class="node-list-wrapper">
        <NodeList
          ref="nodeList"
          v-model:selected-node="selectedNodeModel"
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
        <ReloadIcon v-if="isLoading" class="loading-indicator" />
      </div>
      <div v-if="numFilteredOutNodes > 0" class="filtered-nodes-wrapper">
        <CircleInfoIcon class="info-icon" />
        <div class="filtered-nodes-content">
          <template v-if="isDesktop">
            <span>
              Change filter settings to “All nodes“ to see more advanced nodes
              matching your search criteria.
            </span>
            <Button
              primary
              compact
              class="filtered-nodes-button"
              @click="emit('openPreferences')"
            >
              <FilterCheckIcon />Change filter settings
            </Button>
          </template>
          <template v-else>
            <span>
              There are no available matching nodes. To work with more nodes,
              download the KNIME Analytics Platform.
            </span>
            <DownloadAPButton
              v-if="showDownloadButton"
              compact
              src="node-repository"
              class="filtered-nodes-button"
            />
          </template>
        </div>
      </div>
      <div v-else-if="isNodeListEmpty" class="filtered-nodes-wrapper">
        <CircleInfoIcon class="info-icon" />
        <div class="filtered-nodes-content">
          <span>There are no matching nodes.</span>
          <span
            >Search the
            <a :href="searchHubLink">KNIME Community Hub</a>
            to find more nodes and extensions.</span
          >
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

.results {
  & .content {
    padding: 0 10px 10px;

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

.filtered-nodes-wrapper {
  border-top: 1px solid var(--knime-silver-sand);
  padding-top: 20px;
  display: flex;
  align-items: center;
  margin: 0 10px;

  & .info-icon {
    @mixin svg-icon-size 20;

    stroke: var(--knime-masala);
    min-width: 20px;
    margin-right: 10px;
  }

  & .filtered-nodes-content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    font-weight: 500;
    font-size: 13px;
    font-style: italic;
    width: 100%;

    & .filtered-nodes-button {
      margin-top: 15px;
    }
  }
}
</style>
