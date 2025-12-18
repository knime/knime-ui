<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";

import {
  type BreadcrumbItem,
  type MenuItem,
  SearchInput,
  SubMenu,
  ValueSwitch,
} from "@knime/components";
import DisplayModeListIcon from "@knime/styles/img/icons/list.svg";
import DisplayModeTreeIcon from "@knime/styles/img/icons/unordered-list.svg";
import DisplayModeGridIcon from "@knime/styles/img/icons/view-cards.svg";

import ActionBreadcrumb from "@/components/common/ActionBreadcrumb.vue";
import { useApplicationStore } from "@/store/application/application";
import { useApplicationSettingsStore } from "@/store/application/settings";
import { useComponentSearchStore } from "@/store/componentSearch";
import { useNodeRepositoryStore } from "@/store/nodeRepository";
import {
  type NodeRepositoryDisplayModesType,
  useSettingsStore,
} from "@/store/settings";

import CloseableTagList from "./CloseableTagList.vue";

const nodeRepositoryStore = useNodeRepositoryStore();
const { searchIsActive, tagsOfVisibleNodes: tags } =
  storeToRefs(nodeRepositoryStore);

const componentSearchStore = useComponentSearchStore();

const selectedTags = computed({
  get() {
    return nodeRepositoryStore.selectedTags;
  },
  set(value) {
    nodeRepositoryStore.updateSelectedTags(value);
  },
});

const settingsStore = useSettingsStore();
const displayMode = computed(
  () => settingsStore.settings.nodeRepositoryDisplayMode,
);

const { hasNodeCollectionActive, activeNodeCollection } = storeToRefs(
  useApplicationSettingsStore(),
);
const { nodeRepositoryLoaded } = storeToRefs(useApplicationStore());

const searchContext = defineModel<"nodes" | "components">();
const isComponentSearch = computed(() => searchContext.value === "components");

const currentSearchQuery = computed(() => {
  if (isComponentSearch.value) {
    return componentSearchStore.query;
  } else {
    return nodeRepositoryStore.query;
  }
});

const updateSearchQuery = (value: string) => {
  if (isComponentSearch.value) {
    componentSearchStore.updateQuery(value);
  } else {
    nodeRepositoryStore.updateQuery(value);
  }
};

const switchSearchContext = (value: "nodes" | "components") => {
  searchContext.value = value;
};

const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
  if (isComponentSearch.value) {
    return [{ text: "Components" }];
  }

  // If search results are shown, it's possible to navigate back
  return searchIsActive.value
    ? [{ text: "Nodes", id: "clear" }, { text: "Results" }]
    : [{ text: "Nodes" }];
});

const onBreadcrumbClick = (event: { id: string }) => {
  if (event.id === "clear") {
    nodeRepositoryStore.clearSearchParams();
  }
};

type MenuItemWithDisplayMode = MenuItem<{
  displayMode: NodeRepositoryDisplayModesType;
}>;

const displayModeSubMenuItems = computed<MenuItemWithDisplayMode[]>(() => [
  {
    text: "Grid",
    icon: DisplayModeGridIcon as any,
    selected: displayMode.value === "icon",
    metadata: { displayMode: "icon" },
  },
  {
    text: "List",
    icon: DisplayModeListIcon as any,
    selected: displayMode.value === "list",
    metadata: { displayMode: "list" },
  },
  {
    text: "Tree",
    icon: DisplayModeTreeIcon as any,
    selected: displayMode.value === "tree",
    metadata: { displayMode: "tree" },
  },
]);

const setDisplayMode = (value: NodeRepositoryDisplayModesType) => {
  settingsStore.updateSetting({
    key: "nodeRepositoryDisplayMode",
    value,
  });
};

defineEmits<{ searchBarDownKey: [] }>();

const searchBar = ref<InstanceType<typeof SearchInput>>();
const focusSearchInput = () => {
  searchBar.value?.focus();
};
defineExpose({ focusSearchInput });
</script>

<template>
  <div class="header">
    <div class="title-and-search">
      <div class="search-header" style="margin-bottom: 8px">
        <ActionBreadcrumb
          :items="breadcrumbItems"
          class="repo-breadcrumb"
          @click="onBreadcrumbClick"
        />

        <div class="actions">
          <ValueSwitch
            compact
            :disabled="!nodeRepositoryLoaded"
            :model-value="searchContext"
            :possible-values="[
              { id: 'nodes', text: 'nodes' },
              { id: 'components', text: 'components' },
            ]"
            @update:model-value="switchSearchContext"
          />

          <SubMenu
            v-if="!isComponentSearch"
            :items="displayModeSubMenuItems"
            :teleport-to-body="false"
            class="display-modes-sub-menu"
            data-test-id="node-repository-display-mode-btn"
            button-title="Change display mode"
            @toggle.stop
            @item-click="
              (_: MouseEvent, item) => setDisplayMode(item.metadata.displayMode)
            "
          >
            <Component
              :is="
                displayModeSubMenuItems.find(({ selected }) => selected)?.icon
              "
              class="display-mode-icon"
            />
          </SubMenu>
        </div>
      </div>

      <SearchInput
        ref="searchBar"
        :model-value="currentSearchQuery"
        spellcheck="false"
        compact
        :maxlength="$characterLimits.searchFields"
        :disabled="!nodeRepositoryLoaded"
        :placeholder="
          hasNodeCollectionActive
            ? `Search in ${activeNodeCollection} nodes`
            : 'Search all nodes'
        "
        class="search-bar"
        @keydown.down.prevent="$emit('searchBarDownKey')"
        @clear="nodeRepositoryStore.clearSearchParams"
        @update:model-value="updateSearchQuery"
      />
    </div>

    <CloseableTagList
      v-if="searchIsActive && tags.length && !isComponentSearch"
      v-model="selectedTags"
      :tags="tags"
    />
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.header {
  position: sticky;
  z-index: v-bind("$zIndices.layerStaticPanelDecorations");
  top: 0;
  padding-bottom: var(--space-8);

  & .title-and-search {
    padding: 0 var(--sidebar-panel-padding) var(--space-4);

    & .search-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-8);

      & .actions {
        display: flex;
        margin-top: var(--space-4);
        gap: var(--space-4);
        align-items: center;
      }

      & .display-mode-button {
        width: 30px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;

        & .display-mode-icon {
          @mixin svg-icon-size 18;

          stroke: var(--knime-masala);
        }
      }

      & .filter-button {
        width: 30px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;

        & .filter-icon {
          @mixin svg-icon-size 18;

          stroke: var(--knime-masala);
        }
      }
    }

    & > hr {
      margin-bottom: 2px;
      margin-top: var(--space-4);
    }
  }

  & .display-modes-sub-menu {
    --z-index-common-menu-items-expanded: v-bind(
      "$zIndices.layerExpandedMenus"
    );
  }

  & .repo-breadcrumb {
    & li:not(:last-of-type) span {
      cursor: pointer;
    }

    font-size: 18px;
    font-weight: 400;
    margin: 8px 0 0;
  }
}
</style>
