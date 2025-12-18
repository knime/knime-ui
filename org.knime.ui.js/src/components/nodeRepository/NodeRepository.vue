<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";

import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";
import type { NavigationKey } from "@/components/common/NodeList/NodeList.vue";
import NodeDescription from "@/components/nodeDescription/NodeDescription.vue";
import SidebarSearchResults from "@/components/nodeRepository/NodeSearchResults/SidebarSearchResults.vue";
import { useApplicationStore } from "@/store/application/application";
import { useLifecycleStore } from "@/store/application/lifecycle";
import { useNodeRepositoryStore } from "@/store/nodeRepository";
import { usePanelStore } from "@/store/panel";
import { useSettingsStore } from "@/store/settings";
import ComponentSearchResults from "../componentSearch/ComponentSearchResults.vue";

import CategoryTree from "./CategoryTree.vue";
import NodeRepositoryLoader from "./NodeRepositoryLoader.vue";
import NodesGroupedByTag from "./NodesGroupedByTag/NodesGroupedByTag.vue";
import NodeRepositoryHeader from "./header/NodeRepositoryHeader.vue";

const nodeRepositoryStore = useNodeRepositoryStore();
const { nodesPerTag, showDescriptionForNode, searchIsActive } =
  storeToRefs(nodeRepositoryStore);

const categoryTree = ref<InstanceType<typeof CategoryTree>>();

const displayMode = computed(
  () => useSettingsStore().settings.nodeRepositoryDisplayMode,
);

const isNodeVisible = computed(() => {
  return (
    showDescriptionForNode.value &&
    nodeRepositoryStore.isNodeVisible(showDescriptionForNode.value.id)
  );
});

const { nodeRepositoryLoaded, nodeRepositoryLoadingProgress } = storeToRefs(
  useApplicationStore(),
);

const panelStore = usePanelStore();
const { isExtensionPanelOpen } = storeToRefs(panelStore);

defineEmits<{
  navReachedTop: [];
}>();

watch(
  isExtensionPanelOpen,
  (isOpen) => {
    if (!isOpen) {
      nodeRepositoryStore.setShowDescriptionForNode(null);
    }
  },
  { immediate: true },
);

watch(nodeRepositoryLoaded, (isLoaded, wasLoaded) => {
  if (isLoaded === true && wasLoaded === false && !nodesPerTag.value.length) {
    nodeRepositoryStore.getAllNodes({ append: false });
  }
});

onMounted(async () => {
  await useLifecycleStore().subscribeToNodeRepositoryLoadingEvent();

  // load all nodes for the tag view if we have the data otherwise this is done when the repo is loaded
  if (nodeRepositoryLoaded.value && !nodesPerTag.value.length) {
    nodeRepositoryStore.getAllNodes({ append: false });
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
    panelStore.openExtensionPanel();
    nodeRepositoryStore.setShowDescriptionForNode(nodeTemplate);
    return;
  }

  panelStore.closeExtensionPanel();
};

const header = ref<InstanceType<typeof NodeRepositoryHeader>>();

const searchResults = ref<InstanceType<typeof SidebarSearchResults>>();
const nodesGroupedByTag = ref<InstanceType<typeof NodesGroupedByTag>>();

const onSearchBarDownKey = () => {
  // search (regardless of display mode)
  if (searchIsActive.value) {
    searchResults.value?.focusFirst();
    return;
  }

  // tree
  if (displayMode.value === "tree") {
    categoryTree.value?.focusFirst();
    return;
  }
  // tag
  nodesGroupedByTag.value?.focusFirst();
};

const handleNavReachedTop = (event: { key: NavigationKey }) => {
  if (event.key === "ArrowUp") {
    header.value?.focusSearchInput();
  }
};

const searchContext = ref<"nodes" | "components">("nodes");
</script>

<template>
  <div class="node-repo">
    <NodeRepositoryHeader
      ref="header"
      v-model="searchContext"
      @search-bar-down-key="onSearchBarDownKey"
    />

    <template v-if="nodeRepositoryLoaded">
      <SidebarSearchResults
        v-if="searchIsActive"
        v-show="searchContext === 'nodes'"
        ref="searchResults"
        :display-mode="displayMode"
        @nav-reached-top="handleNavReachedTop($event)"
        @show-node-description="toggleNodeDescription"
      />
      <NodesGroupedByTag
        v-else-if="displayMode !== 'tree'"
        v-show="searchContext === 'nodes'"
        ref="nodesGroupedByTag"
        :display-mode="displayMode"
        @nav-reached-top="handleNavReachedTop($event)"
        @show-node-description="toggleNodeDescription"
      />
      <CategoryTree
        v-else
        v-show="searchContext === 'nodes'"
        ref="categoryTree"
        @nav-reached-top="handleNavReachedTop($event)"
        @show-node-description="toggleNodeDescription"
      />

      <ComponentSearchResults
        v-show="searchContext === 'components'"
        :active="searchContext === 'components'"
      />
    </template>

    <template v-else>
      <NodeRepositoryLoader
        :progress="nodeRepositoryLoadingProgress?.progress"
        :extension-name="nodeRepositoryLoadingProgress?.extensionName"
      />
    </template>

    <Portal v-if="isExtensionPanelOpen" to="extension-panel">
      <Transition name="extension-panel">
        <NodeDescription
          show-close-button
          :params="isNodeVisible ? showDescriptionForNode : null"
          @close="panelStore.closeExtensionPanel"
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
