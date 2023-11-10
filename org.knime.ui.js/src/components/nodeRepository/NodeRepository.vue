<script setup lang="ts">
import { computed, watch, onMounted } from "vue";

import { API } from "@api";
import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";
import { useStore } from "@/composables/useStore";
import NodeDescription from "@/components/nodeRepository/NodeDescription.vue";
import SidebarSearchResults from "@/components/nodeRepository/SidebarSearchResults.vue";
import { TABS } from "@/store/panel";
import CategoryResults from "./CategoryResults.vue";
import NodeRepositoryHeader from "./NodeRepositoryHeader.vue";

const DESELECT_NODE_DELAY = 50; // ms - keep in sync with extension panel transition in Sidebar.vue

const store = useStore();
const nodesPerCategory = computed(
  () => store.state.nodeRepository.nodesPerCategory,
);
const selectedNode = computed(() => store.state.nodeRepository.selectedNode);
const searchIsActive = computed(
  () => store.getters["nodeRepository/searchIsActive"],
);
const isSelectedNodeVisible = computed(
  () => store.getters["nodeRepository/isSelectedNodeVisible"],
);
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
  return activeTab.value[activeProjectId.value] === TABS.NODE_REPOSITORY;
});
const isExtensionPanelOpen = computed(
  () => store.state.panel.isExtensionPanelOpen,
);

watch(isExtensionPanelOpen, (isOpen) => {
  if (!isOpen) {
    setTimeout(() => {
      store.commit("nodeRepository/setSelectedNode", null);
    }, DESELECT_NODE_DELAY);
  }
});

onMounted(() => {
  if (!nodesPerCategory.value.length) {
    store.dispatch("nodeRepository/getAllNodes", { append: false });
  }
});

const toggleNodeDescription = ({
  isSelected,
  nodeTemplate,
}: {
  isSelected: boolean;
  nodeTemplate: NodeTemplateWithExtendedPorts;
}) => {
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
    <NodeRepositoryHeader />

    <template v-if="nodeRepositoryLoaded">
      <SidebarSearchResults
        v-if="searchIsActive"
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
    </template>
    <template v-else>
      <div
        v-if="Object.keys(nodeRepositoryLoadingProgress).length > 1"
        class="not-ready"
      >
        <progress :value="nodeRepositoryLoadingProgress.progress" max="100">
          {{ nodeRepositoryLoadingProgress.progress * 100 }}%
        </progress>
        <div class="progress-message">
          <span
            >Loading: {{ nodeRepositoryLoadingProgress.extensionName }}
          </span>
        </div>
      </div>
    </template>

    <Portal
      v-if="isExtensionPanelOpen && isNodeRepositoryTabActive"
      to="extension-panel"
    >
      <Transition name="extension-panel">
        <NodeDescription
          show-close-button
          :selected-node="isSelectedNodeVisible ? selectedNode : null"
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

.not-ready {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  padding: 10px;
  margin-top: 60px;

  & svg {
    margin-bottom: 5px;

    @mixin svg-icon-size 24;
  }

  & .repo-breadcrumb {
    & li:not(:last-of-type) span {
      cursor: pointer;
    }

    font-size: 18px;
    font-weight: 400;
    margin: 8px 0 0;
  }

  & progress[value] {
    --color: var(--knime-yellow);
    --background: var(--knime-silver-sand);

    width: 200px;
    height: 10px;
    margin: 0 10px;
    appearance: none;
  }

  & progress[value]::-webkit-progress-bar {
    border-radius: 10px;
    background: var(--background);
  }

  & progress[value]::-webkit-progress-value {
    border-radius: 10px;
    background: var(--color);
    transition: width 2.5s ease-in-out;
  }

  & .progress-message {
    display: flex;
    flex-direction: column;
    margin-top: 30px;
  }
}
</style>
