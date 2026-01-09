<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";

import {
  type MenuItem,
  SearchInput,
  SubMenu,
  ValueSwitch,
} from "@knime/components";
import DisplayModeListIcon from "@knime/styles/img/icons/list.svg";
import DisplayModeTreeIcon from "@knime/styles/img/icons/unordered-list.svg";
import DisplayModeGridIcon from "@knime/styles/img/icons/view-cards.svg";

import { useFeatures } from "@/plugins/feature-flags";
import { useApplicationStore } from "@/store/application/application";
import { useApplicationSettingsStore } from "@/store/application/settings";
import { useComponentSearchStore } from "@/store/componentSearch";
import { useNodeRepositoryStore } from "@/store/nodeRepository";
import {
  type NodeRepositoryDisplayModesType,
  useSettingsStore,
} from "@/store/settings";
import { getToastPresets } from "@/toastPresets";

import CloseableTagList from "./CloseableTagList.vue";

const { toastPresets } = getToastPresets();
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
const { isComponentSearchEnabled } = useFeatures();

const searchContext = defineModel<"nodes" | "components">();
const isComponentSearch = computed(() => searchContext.value === "components");

const currentSearchQuery = computed(() => {
  if (isComponentSearch.value) {
    return componentSearchStore.query;
  } else {
    return nodeRepositoryStore.query;
  }
});

const updateSearchQuery = async (value: string) => {
  try {
    const updateQueryFn = isComponentSearch.value
      ? componentSearchStore.updateQuery
      : nodeRepositoryStore.updateQuery;
    await updateQueryFn(value);
  } catch (error) {
    const handler = isComponentSearch.value
      ? toastPresets.search.componentSearch
      : toastPresets.search.nodeSearch;
    handler({ error });
  }
};

const switchSearchContext = (value: "nodes" | "components") => {
  if (value === "components" && !isComponentSearchEnabled()) {
    return;
  }

  searchContext.value = value;
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

const searchPlaceholderText = computed(() => {
  if (isComponentSearch.value) {
    return "Search components in the KNIME Hub";
  }

  return hasNodeCollectionActive.value
    ? `Search in ${activeNodeCollection.value} nodes`
    : "Search all nodes";
});
</script>

<template>
  <div class="header">
    <div class="title-and-search">
      <div class="search-header">
        <ValueSwitch
          v-if="isComponentSearchEnabled()"
          compact
          data-test-id="search-context-switch"
          :disabled="!nodeRepositoryLoaded"
          :model-value="searchContext"
          :possible-values="[
            { id: 'nodes', text: 'Nodes' },
            { id: 'components', text: 'Components' },
          ]"
          @update:model-value="switchSearchContext"
        />

        <div class="actions">
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
        :placeholder="searchPlaceholderText"
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
      margin: var(--space-12) 0;
      min-height: 30px;

      & .actions {
        display: flex;
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
