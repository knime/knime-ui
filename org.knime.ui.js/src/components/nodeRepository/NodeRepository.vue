<script setup lang="ts">
import { computed, watch, onMounted } from "vue";
import { useStore } from "@/composables/useStore";

import FunctionButton from "webapps-common/ui/components/FunctionButton.vue";
import FilterIcon from "webapps-common/ui/assets/img/icons/filter.svg";

import ActionBreadcrumb from "@/components/common/ActionBreadcrumb.vue";
import SearchBar from "@/components/common/SearchBar.vue";
import CloseableTagList from "./CloseableTagList.vue";
import CategoryResults from "./CategoryResults.vue";
import NodeDescription from "@/components/nodeRepository/NodeDescription.vue";
import SidebarSearchResults from "@/components/nodeRepository/SidebarSearchResults.vue";
import { TABS } from "@/store/panel";
import { API } from "@api";

const DESELECT_NODE_DELAY = 50; // ms - keep in sync with extension panel transition in Sidebar.vue

const store = useStore();
const topNodes = computed(() => store.state.nodeRepository.topNodes);
const nodesPerCategory = computed(
  () => store.state.nodeRepository.nodesPerCategory,
);
const selectedNode = computed(() => store.state.nodeRepository.selectedNode);
const activeProjectId = computed(() => store.state.application.activeProjectId);
const activeTab = computed(() => store.state.panel.activeTab);
const isExtensionPanelOpen = computed(
  () => store.state.panel.isExtensionPanelOpen,
);

const showSearchResults = computed(
  () => store.getters["nodeRepository/searchIsActive"],
);
const isSelectedNodeVisible = computed(
  () => store.getters["nodeRepository/isSelectedNodeVisible"],
);
const tags = computed(() => store.getters["nodeRepository/tagsOfVisibleNodes"]);

const isNodeRepositoryTabActive = computed(
  () => activeTab[activeProjectId.value] === TABS.NODE_REPOSITORY,
);
const selectedTags = computed({
  get() {
    return store.state.nodeRepository.selectedTags;
  },
  set(value) {
    store.dispatch("nodeRepository/setSelectedTags", value);
  },
});
const breadcrumbItems = computed(() =>
  showSearchResults.value
    ? [{ text: "Repository", id: "clear" }, { text: "Results" }]
    : [{ text: "Repository" }],
);

watch(
  isExtensionPanelOpen,
  (isOpen) => {
    if (!isOpen) {
      setTimeout(() => {
        store.commit("nodeRepository/setSelectedNode", null);
      }, DESELECT_NODE_DELAY);
    }
  },
  { immediate: true },
);

onMounted(() => {
  if (!nodesPerCategory.value.length) {
    store.dispatch("nodeRepository/getAllNodes", { append: false });
  }
});

const onBreadcrumbClick = (e) => {
  if (e.id === "clear") {
    store.dispatch("nodeRepository/clearSearchParams");
  }
};

const toggleNodeDescription = ({ isSelected, nodeTemplate }) => {
  if (!isSelected || !isExtensionPanelOpen.value) {
    store.dispatch("panel/openExtensionPanel");
    store.commit("nodeRepository/setSelectedNode", nodeTemplate);
    return;
  }

  store.dispatch("panel/closeExtensionPanel");
};

const openKnimeUIPreferencePage = () => {
  API.desktop.openWebUIPreferencePage();
};
</script>

<template>
  <div class="node-repo">
    <div class="header">
      <div class="title-and-search">
        <div class="search-header">
          <ActionBreadcrumb
            :items="breadcrumbItems"
            class="repo-breadcrumb"
            @click="onBreadcrumbClick"
          />
          <FunctionButton
            class="filter-button"
            title="Open search filters"
            @click="openKnimeUIPreferencePage"
          >
            <FilterIcon />
          </FunctionButton>
        </div>
        <hr />
        <SearchBar
          :model-value="$store.state.nodeRepository.query"
          placeholder="Search Nodes"
          class="search-bar"
          @clear="$store.dispatch('nodeRepository/clearSearchParams')"
          @update:model-value="
            $store.dispatch('nodeRepository/updateQuery', $event)
          "
        />
      </div>
      <CloseableTagList
        v-if="showSearchResults && tags.length"
        v-model="selectedTags"
        :tags="tags"
      />
      <hr v-if="!topNodes || tags.length" />
    </div>
    <SidebarSearchResults
      v-if="showSearchResults"
      ref="searchResults"
      @show-node-description="toggleNodeDescription"
    />
    <CategoryResults v-else @show-node-description="toggleNodeDescription" />
    <Portal
      v-if="isExtensionPanelOpen && isNodeRepositoryTabActive"
      to="extension-panel"
    >
      <Transition name="extension-panel">
        <NodeDescription
          show-close-button
          :selected-node="isSelectedNodeVisible ? selectedNode : null"
          @close="$store.dispatch('panel/closeExtensionPanel')"
        />
      </Transition>
    </Portal>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.node-repo {
  font-family: "Roboto Condensed", sans-serif;
  height: 100%;
  display: flex;
  flex-direction: column;
  user-select: none;

  & hr {
    border: none;
    margin: 0;
  }
}

.header {
  position: sticky;
  background: var(--knime-porcelain);
  z-index: 2;
  top: 0;

  & > hr {
    margin-top: 8px;
  }

  & .title-and-search {
    padding: 0 20px 5px;

    & .search-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      & .filter-button {
        width: 30px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 5px;

        & svg {
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
    font-family: "Roboto Condensed", sans-serif;
    cursor: pointer;
    font-size: 18px;
    font-weight: 400;
    margin: 8px 0 0;

    & :deep(span),
    & :deep(a) {
      line-height: 36px;
      padding: 0;
    }

    & :deep(svg.arrow) {
      margin-top: 6px;
    }
  }
}

.search-bar {
  height: 40px;
  font-size: 17px;

  &:hover {
    background-color: var(--knime-silver-sand-semi);
  }

  &:focus-within {
    background-color: var(--knime-white);
    border-color: var(--knime-masala);
  }
}

.extension-panel-enter-active {
  transition: all 50ms ease-in;
}

.extension-panel-leave-active {
  transition: all 50ms ease-out;
}

.extension-panel-enter-from,
.extension-panel-leave-to {
  opacity: 0;
}
</style>
