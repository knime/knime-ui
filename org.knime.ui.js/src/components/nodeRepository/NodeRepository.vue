<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef, watch } from "vue";
import { storeToRefs } from "pinia";

import type { NavigationKey } from "@/components/common/NodeList/NodeList.vue";
import NodeDescription from "@/components/nodeDescription/NodeDescription.vue";
import SidebarNodeSearchResults from "@/components/nodeRepository/NodeSearchResults/SidebarNodeSearchResults.vue";
import { useApplicationStore } from "@/store/application/application";
import { useLifecycleStore } from "@/store/application/lifecycle";
import { useNodeRepositoryStore } from "@/store/nodeRepository";
import { usePanelStore } from "@/store/panel";
import { useSettingsStore } from "@/store/settings";
import type { NodeTemplateWithExtendedPorts } from "@/util/data-mappers";
import ComponentSearchResults from "../componentSearch/ComponentSearchResults.vue";

import NodeRepositoryLoader from "./NodeRepositoryLoader.vue";
import NodeRepositoryTree from "./NodeRepositoryTree/NodeRepositoryTree.vue";
import NodesGroupedByTag from "./NodesGroupedByTag/NodesGroupedByTag.vue";
import NodeRepositoryHeader from "./header/NodeRepositoryHeader.vue";

const nodeRepositoryStore = useNodeRepositoryStore();
const { nodesPerTag, showDescriptionForNode, searchIsActive } =
  storeToRefs(nodeRepositoryStore);

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

const searchContext = ref<"nodes" | "components">("nodes");

const header = useTemplateRef("header");
const nodeSearchResults = useTemplateRef("nodeSearchResults");
const nodesGroupedByTag = useTemplateRef("nodesGroupedByTag");
const nodeRepositoryTree = useTemplateRef("nodeRepositoryTree");
const componentSearchResults = useTemplateRef("componentSearchResults");

const onSearchBarDownKey = () => {
  if (searchContext.value === "components") {
    componentSearchResults.value?.focusFirst();
    return;
  }

  if (searchIsActive.value) {
    nodeSearchResults.value?.focusFirst();
    return;
  }

  if (displayMode.value === "tree") {
    nodeRepositoryTree.value?.focusFirst();
    return;
  }

  nodesGroupedByTag.value?.focusFirst();
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
      v-model="searchContext"
      @search-bar-down-key="onSearchBarDownKey"
    />

    <template v-if="nodeRepositoryLoaded">
      <div v-show="searchContext === 'nodes'" style="height: 100%">
        <SidebarNodeSearchResults
          v-if="searchIsActive"
          ref="nodeSearchResults"
          :display-mode="displayMode"
          @nav-reached-top="handleNavReachedTop($event)"
          @show-node-description="toggleNodeDescription"
        />
        <NodesGroupedByTag
          v-else-if="displayMode !== 'tree'"
          ref="nodesGroupedByTag"
          :display-mode="displayMode"
          @nav-reached-top="handleNavReachedTop($event)"
          @show-node-description="toggleNodeDescription"
        />
        <NodeRepositoryTree
          v-else
          ref="nodeRepositoryTree"
          @nav-reached-top="handleNavReachedTop($event)"
          @show-node-description="toggleNodeDescription"
        />
      </div>

      <ComponentSearchResults
        v-show="searchContext === 'components'"
        ref="componentSearchResults"
        :active="searchContext === 'components'"
        @nav-reached-top="handleNavReachedTop($event)"
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
