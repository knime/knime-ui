<script setup lang="ts">
import { computed, ref } from "vue";

import {
  type BreadcrumbItem,
  FunctionButton,
  type MenuItem,
  SearchInput,
  SubMenu,
} from "@knime/components";
import FilterCheckIcon from "@knime/styles/img/icons/filter-check.svg";
import FilterIcon from "@knime/styles/img/icons/filter.svg";
import DisplayModeListIcon from "@knime/styles/img/icons/list.svg";
import DisplayModeTreeIcon from "@knime/styles/img/icons/unordered-list.svg";
import DisplayModeGridIcon from "@knime/styles/img/icons/view-cards.svg";

import { API } from "@/api";
import ActionBreadcrumb from "@/components/common/ActionBreadcrumb.vue";
import { useStore } from "@/composables/useStore";
import { isDesktop } from "@/environment";
import type { NodeRepositoryDisplayModesType } from "@/store/settings";

import CloseableTagList from "./CloseableTagList.vue";

const store = useStore();

const searchIsActive = computed(
  () => store.getters["nodeRepository/searchIsActive"],
);
const tags = computed(() => store.getters["nodeRepository/tagsOfVisibleNodes"]);

const displayMode = computed(
  () => store.state.settings.settings.nodeRepositoryDisplayMode,
);
const hasNodeCollectionActive = computed(
  () => store.state.application.hasNodeCollectionActive,
);
const activeNodeCollection = computed(
  () => store.state.application.activeNodeCollection,
);
const nodeRepositoryLoaded = computed(
  () => store.state.application.nodeRepositoryLoaded,
);

const selectedTags = computed({
  get() {
    return store.state.nodeRepository.selectedTags;
  },
  set(value) {
    store.dispatch("nodeRepository/setSelectedTags", value);
  },
});

const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
  // If search results are shown, it's possible to navigate back
  return searchIsActive.value
    ? [{ text: "Nodes", id: "clear" }, { text: "Results" }]
    : [{ text: "Nodes" }];
});

const onBreadcrumbClick = (event: { id: string }) => {
  if (event.id === "clear") {
    store.dispatch("nodeRepository/clearSearchParams");
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
  store.dispatch("settings/updateSetting", {
    key: "nodeRepositoryDisplayMode",
    value,
  });
};

const openKnimeUIPreferencePage = () => {
  API.desktop.openWebUIPreferencePage();
};

defineEmits<{ (e: "searchBarDownKey"): void }>();

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
        <div class="view-settings">
          <SubMenu
            :items="displayModeSubMenuItems"
            :teleport-to-body="false"
            class="display-modes-sub-menu"
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
          <FunctionButton
            v-if="isDesktop"
            class="filter-button"
            title="Open search filters"
            :disabled="!nodeRepositoryLoaded"
            @click="openKnimeUIPreferencePage"
          >
            <FilterCheckIcon
              v-if="hasNodeCollectionActive"
              class="filter-icon"
            />
            <FilterIcon v-else class="filter-icon" />
          </FunctionButton>
        </div>
      </div>
      <SearchInput
        ref="searchBar"
        :model-value="store.state.nodeRepository.query"
        spellcheck="false"
        compact
        :maxlength="300"
        :disabled="!nodeRepositoryLoaded"
        :placeholder="
          hasNodeCollectionActive
            ? `Search in ${activeNodeCollection} nodes`
            : 'Search all nodes'
        "
        class="search-bar"
        @keydown.down.prevent="$emit('searchBarDownKey')"
        @clear="store.dispatch('nodeRepository/clearSearchParams')"
        @update:model-value="
          store.dispatch('nodeRepository/updateQuery', $event)
        "
      />
    </div>
    <CloseableTagList
      v-if="searchIsActive && tags.length"
      v-model="selectedTags"
      :tags="tags"
    />
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.header {
  position: sticky;
  z-index: 2;
  top: 0;
  padding-bottom: var(--space-8);

  & .title-and-search {
    padding: 0 var(--sidebar-panel-padding) var(--space-4);

    & .search-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-8);

      & .view-settings {
        display: flex;
        margin-top: var(--space-4);
        gap: var(--space-4);
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
