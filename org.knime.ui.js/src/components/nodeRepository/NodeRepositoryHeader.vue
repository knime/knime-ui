<script setup lang="ts">
import { computed, ref } from "vue";

import { FunctionButton, SearchInput } from "@knime/components";
import FilterIcon from "@knime/styles/img/icons/filter.svg";
import FilterCheckIcon from "@knime/styles/img/icons/filter-check.svg";
import ListIconCheck from "@knime/styles/img/icons/unordered-list.svg";
import ListIcon from "@knime/styles/img/icons/view-cards.svg";

import { API } from "@api";
import { useStore } from "@/composables/useStore";
import ActionBreadcrumb from "@/components/common/ActionBreadcrumb.vue";
import CloseableTagList from "./CloseableTagList.vue";

import { isDesktop } from "@/environment";

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

const breadcrumbItems = computed(() => {
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

const toggleListView = () => {
  store.dispatch("settings/updateSetting", {
    key: "nodeRepositoryDisplayMode",
    value: displayMode.value === "list" ? "icon" : "list",
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
          <FunctionButton
            class="list-view-button"
            title="Switch between icon and list view"
            :disabled="!nodeRepositoryLoaded"
            @click="toggleListView"
          >
            <ListIcon v-if="displayMode === 'list'" class="list-icon" />
            <ListIconCheck v-else class="list-icon" />
          </FunctionButton>
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
        :maxlength="300"
        :disabled="!nodeRepositoryLoaded"
        :placeholder="
          hasNodeCollectionActive
            ? `Search in ${activeNodeCollection} nodes`
            : 'Search all nodes'
        "
        class="search-bar"
        tabindex="-1"
        @keydown.down.prevent.stop="$emit('searchBarDownKey')"
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
  padding-bottom: 8px;

  & .title-and-search {
    padding: 0 20px 5px;

    & .search-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;

      & .view-settings {
        display: flex;
        margin-top: 5px;
        gap: 5px;
      }

      & .list-view-button {
        width: 30px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;

        & .list-icon {
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
      margin-top: 5px;
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
