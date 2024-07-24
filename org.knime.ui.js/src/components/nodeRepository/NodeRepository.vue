<script setup lang="ts">
import { computed, watch, onMounted, ref } from "vue";

import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";
import { useStore } from "@/composables/useStore";
import NodeDescription from "@/components/nodeDescription/NodeDescription.vue";
import SidebarSearchResults from "@/components/nodeRepository/SidebarSearchResults.vue";
import { TABS } from "@/store/panel";
import CategoryResults from "./CategoryResults.vue";
import CategoryTree from "./CategoryTree.vue";

import NodeRepositoryHeader from "./NodeRepositoryHeader.vue";
import NodeRepositoryLoader from "./NodeRepositoryLoader.vue";
import type { NavigationKey } from "./NodeList.vue";

const DESELECT_NODE_DELAY = 50; // ms - keep in sync with extension panel transition in Sidebar.vue

const store = useStore();
const nodesPerCategory = computed(
  () => store.state.nodeRepository.nodesPerCategory,
);
const showDescriptionForNode = computed(
  () => store.state.nodeRepository.showDescriptionForNode,
);
const searchIsActive = computed(
  () => store.getters["nodeRepository/searchIsActive"],
);
const isNodeVisible = computed(() => true);
//   // TODO: add tree state here (which is not so simple)
//   store.getters["nodeRepository/isNodeVisible"](
//     showDescriptionForNode.value?.id,
//   ),
// );
const displayMode = computed(
  () => store.state.settings.settings.nodeRepositoryDisplayMode,
);
const activeProjectId = computed(() => store.state.application.activeProjectId);
const nodeRepositoryLoaded = computed(
  () => store.state.application.nodeRepositoryLoaded,
);
const nodeRepositoryLoadingProgress = computed(
  () => store.state.application.nodeRepositoryLoadingProgress,
);
const activeTab = computed(() => store.state.panel.activeTab);
const isNodeRepositoryTabActive = computed(() => {
  return (
    activeProjectId.value &&
    activeTab.value[activeProjectId.value] === TABS.NODE_REPOSITORY
  );
});
const isExtensionPanelOpen = computed(
  () => store.state.panel.isExtensionPanelOpen,
);

defineEmits<{
  (e: "navReachedTop"): void;
}>();

watch(isExtensionPanelOpen, (isOpen) => {
  if (!isOpen) {
    setTimeout(() => {
      store.commit("nodeRepository/setShowDescriptionForNode", null);
    }, DESELECT_NODE_DELAY);
  }
});

watch(nodeRepositoryLoaded, (isLoaded, wasLoaded) => {
  if (
    isLoaded === true &&
    wasLoaded === false &&
    !nodesPerCategory.value.length
  ) {
    store.dispatch("nodeRepository/getAllNodes", { append: false });
  }
});

onMounted(() => {
  store.dispatch("application/subscribeToNodeRepositoryLoadingEvent");

  // load all nodes for the category view if we have the data otherwise this is done when the repo is loaded
  if (nodeRepositoryLoaded.value && !nodesPerCategory.value.length) {
    store.dispatch("nodeRepository/getAllNodes", { append: false });
  }
});

const toggleNodeDescription = ({
  isDescriptionActive,
  nodeTemplate,
}: {
  isDescriptionActive: boolean;
  nodeTemplate: NodeTemplateWithExtendedPorts;
}) => {
  if (!isDescriptionActive || !isExtensionPanelOpen.value) {
    store.dispatch("panel/openExtensionPanel");
    store.commit("nodeRepository/setShowDescriptionForNode", nodeTemplate);
    return;
  }

  store.dispatch("panel/closeExtensionPanel");
};

const header = ref<InstanceType<typeof NodeRepositoryHeader>>();

const searchResults = ref<InstanceType<typeof SidebarSearchResults>>();
const categoryResults = ref<InstanceType<typeof CategoryResults>>();

const onSearchBarDownKey = () => {
  if (searchIsActive.value) {
    searchResults.value?.focusFirst();
  } else {
    categoryResults.value?.focusFirst();
  }
};

const handleNavReachedTop = (event: { key: NavigationKey }) => {
  if (event.key === "ArrowUp") {
    header.value?.focusSearchInput();
  }
};
</script>

<template>
  <div class="node-repo">
    <NodeRepositoryHeader
      ref="header"
      @search-bar-down-key="onSearchBarDownKey"
    />

    <template v-if="nodeRepositoryLoaded">
      <SidebarSearchResults
        v-if="searchIsActive"
        ref="searchResults"
        :display-mode="displayMode"
        @nav-reached-top="handleNavReachedTop($event)"
        @show-node-description="toggleNodeDescription"
      />
      <!--<CategoryResults
        v-else-if="displayMode !== 'tree'"
        ref="categoryResults"
        :display-mode="displayMode"
        @nav-reached-top="handleNavReachedTop($event)"
        @show-node-description="toggleNodeDescription"
      />-->
      <CategoryTree
        v-else
        ref="categoryTree"
        @nav-reached-top="handleNavReachedTop($event)"
        @show-node-description="toggleNodeDescription"
      />
    </template>

    <template v-else>
      <NodeRepositoryLoader
        :progress="nodeRepositoryLoadingProgress?.progress"
        :extension-name="nodeRepositoryLoadingProgress?.extensionName"
      />
    </template>

    <Portal
      v-if="isExtensionPanelOpen && isNodeRepositoryTabActive"
      to="extension-panel"
    >
      <Transition name="extension-panel">
        <NodeDescription
          show-close-button
          :params="isNodeVisible ? showDescriptionForNode : null"
          @close="store.dispatch('panel/closeExtensionPanel')"
        />
      </Transition>
    </Portal>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.node-repo {
  font-family: Roboto, sans-serif;
  height: 100%;
  display: flex;
  flex-direction: column;
  user-select: none;
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
