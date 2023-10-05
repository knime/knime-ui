<script>
import { mapState, mapGetters, mapMutations } from "vuex";

import ActionBreadcrumb from "@/components/common/ActionBreadcrumb.vue";
import SearchBar from "@/components/common/SearchBar.vue";
import CloseableTagList from "./CloseableTagList.vue";
import CategoryResults from "./CategoryResults.vue";
import NodeDescription from "@/components/nodeRepository/NodeDescription.vue";
import CloseButton from "@/components/common/CloseButton.vue";
import SidebarSearchResults from "@/components/nodeRepository/SidebarSearchResults.vue";

const DESELECT_NODE_DELAY = 50; // ms - keep in sync with extension panel transition in Sidebar.vue

export default {
  components: {
    ActionBreadcrumb,
    SidebarSearchResults,
    CloseableTagList,
    SearchBar,
    CategoryResults,
    NodeDescription,
    CloseButton,
  },
  computed: {
    ...mapState("nodeRepository", [
      "topNodes",
      "nodesPerCategory",
      "selectedNode",
    ]),
    ...mapState("panel", ["isExtensionPanelOpen"]),
    ...mapGetters("nodeRepository", {
      showSearchResults: "searchIsActive",
      isSelectedNodeVisible: "isSelectedNodeVisible",
      tags: "tagsOfVisibleNodes",
    }),

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
          this.setSelectedNode(null);
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
    ...mapMutations("nodeRepository", ["setSelectedNode"]),
    /* Navigation */
    onBreadcrumbClick(e) {
      if (e.id === "clear") {
        this.$store.dispatch("nodeRepository/clearSearchParams");
      }
    },
  },
};
</script>

<template>
  <div class="node-repo">
    <div class="header">
      <div class="title-and-search">
        <ActionBreadcrumb
          :items="breadcrumbItems"
          class="repo-breadcrumb"
          @click="onBreadcrumbClick"
        />
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
    <SidebarSearchResults v-if="showSearchResults" ref="searchResults" />
    <CategoryResults v-else />
    <Portal v-if="isExtensionPanelOpen" to="extension-panel">
      <Transition name="extension-panel">
        <NodeDescription
          :selected-node="isSelectedNodeVisible ? selectedNode : null"
        >
          <template #header-action>
            <CloseButton
              class="close-button"
              @close="$store.dispatch('panel/closeExtensionPanel')"
            />
          </template>
        </NodeDescription>
      </Transition>
    </Portal>
  </div>
</template>

<style lang="postcss" scoped>
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

& .close-button {
  margin-top: 2px;
  margin-right: -15px;
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
