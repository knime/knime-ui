<script>
import { mapState, mapGetters } from "vuex";

import FunctionButton from "webapps-common/ui/components/FunctionButton.vue";
import FilterIcon from "webapps-common/ui/assets/img/icons/filter.svg";
import FilterCheckIcon from "webapps-common/ui/assets/img/icons/filter-check.svg";
import ListIconCheck from "webapps-common/ui/assets/img/icons/unordered-list.svg";
import ListIcon from "webapps-common/ui/assets/img/icons/view-cards.svg";

import ActionBreadcrumb from "@/components/common/ActionBreadcrumb.vue";
import SearchBar from "@/components/common/SearchBar.vue";
import CloseableTagList from "./CloseableTagList.vue";
import CategoryResults from "./CategoryResults.vue";
import NodeDescription from "@/components/nodeRepository/NodeDescription.vue";
import SidebarSearchResults from "@/components/nodeRepository/SidebarSearchResults.vue";
import { TABS } from "@/store/panel";
import { API } from "@api";

const DESELECT_NODE_DELAY = 50; // ms - keep in sync with extension panel transition in Sidebar.vue

export default {
  components: {
    ActionBreadcrumb,
    SidebarSearchResults,
    CloseableTagList,
    SearchBar,
    CategoryResults,
    NodeDescription,
    FunctionButton,
    FilterIcon,
    FilterCheckIcon,
    ListIcon,
    ListIconCheck,
  },
  data() {
    return {
      displayMode: "icon",
    };
  },
  computed: {
    ...mapState("nodeRepository", [
      "nodes",
      "nodesPerCategory",
      "selectedNode",
    ]),
    ...mapState("application", ["activeProjectId", "hasNodeCollectionActive"]),
    ...mapState("panel", ["activeTab", "isExtensionPanelOpen"]),
    ...mapGetters("nodeRepository", {
      showSearchResults: "searchIsActive",
      isSelectedNodeVisible: "isSelectedNodeVisible",
      tags: "tagsOfVisibleNodes",
    }),

    isNodeRepositoryTabActive() {
      return this.activeTab[this.activeProjectId] === TABS.NODE_REPOSITORY;
    },

    /* Search and Filter */
    selectedTags: {
      get() {
        return this.$store.state.nodeRepository.selectedTags;
      },
      set(value) {
        this.$store.dispatch("nodeRepository/setSelectedTags", value);
      },
    },

    /* Navigation */
    breadcrumbItems() {
      // If search results are shown, it's possible to navigate back
      return this.showSearchResults
        ? [{ text: "Repository", id: "clear" }, { text: "Results" }]
        : [{ text: "Repository" }];
    },
  },
  watch: {
    // deselect node on panel close
    isExtensionPanelOpen(isOpen) {
      if (!isOpen) {
        setTimeout(() => {
          this.$store.commit("nodeRepository/setSelectedNode", null);
        }, DESELECT_NODE_DELAY);
      }
    },
  },

  mounted() {
    if (!this.nodesPerCategory.length) {
      this.$store.dispatch("nodeRepository/getAllNodes", { append: false });
    }
  },
  methods: {
    /* Navigation */
    onBreadcrumbClick(e) {
      if (e.id === "clear") {
        this.$store.dispatch("nodeRepository/clearSearchParams");
      }
    },
    toggleListView() {
      this.displayMode = this.displayMode === "list" ? "icon" : "list";
    },

    toggleNodeDescription({ isSelected, nodeTemplate }) {
      if (!isSelected || !this.isExtensionPanelOpen) {
        this.$store.dispatch("panel/openExtensionPanel");
        this.$store.commit("nodeRepository/setSelectedNode", nodeTemplate);
        return;
      }

      this.$store.dispatch("panel/closeExtensionPanel");
    },

    openKnimeUIPreferencePage() {
      API.desktop.openWebUIPreferencePage();
    },
  },
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
          <div class="view-settings">
            <FunctionButton
              class="list-view-button"
              title="Switch between icon and list view"
              @click="toggleListView"
            >
              <ListIcon v-if="displayMode === 'list'" />
              <ListIconCheck v-else />
            </FunctionButton>
            <FunctionButton
              class="filter-button"
              title="Open search filters"
              @click="openKnimeUIPreferencePage"
            >
              <FilterCheckIcon v-if="hasNodeCollectionActive" />
              <FilterIcon v-else />
            </FunctionButton>
          </div>
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
      <hr v-if="!nodes || tags.length" />
    </div>
    <SidebarSearchResults
      v-if="showSearchResults"
      ref="searchResults"
      :display-mode="displayMode"
      @show-node-description="toggleNodeDescription"
      @open-preferences="openKnimeUIPreferencePage"
    />
    <CategoryResults
      v-else
      :display-mode="displayMode"
      @show-node-description="toggleNodeDescription"
    />
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

        & svg {
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
