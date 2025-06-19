<script lang="ts" setup>
import { onUnmounted, ref, useTemplateRef } from "vue";
import { storeToRefs } from "pinia";

import SidebarPanelLayout from "@/components/common/side-panel/SidebarPanelLayout.vue";
import SpaceExplorer from "@/components/spaces/SpaceExplorer.vue";
import SpaceExplorerActions from "@/components/spaces/SpaceExplorerActions.vue";
import SpaceSelectionDropdown from "@/components/spaces/SpaceSelectionDropdown/SpaceSelectionDropdown.vue";
import { useApplicationStore } from "@/store/application/application";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";

const { activeProjectId } = storeToRefs(useApplicationStore());
const spaceOperationsStore = useSpaceOperationsStore();
const { currentSelectedItemIds } = storeToRefs(spaceOperationsStore);

const actions = useTemplateRef("actions");

onUnmounted(() => {
  spaceOperationsStore.setCurrentSelectedItemIds([]);
});

const filterQuery = ref("");

const changeDirectory = (pathId: string) => {
  spaceOperationsStore.changeDirectory({
    projectId: activeProjectId.value!,
    pathId,
  });
  filterQuery.value = "";
};
</script>

<template>
  <SidebarPanelLayout class="sidebar-space-explorer-panel-layout">
    <template #header>
      <SpaceSelectionDropdown :project-id="activeProjectId!" />

      <SpaceExplorerActions
        ref="actions"
        v-model:filter-query="filterQuery"
        mode="mini"
        class="actions"
        :project-id="activeProjectId!"
        :selected-item-ids="currentSelectedItemIds"
      />
    </template>
    <SpaceExplorer
      v-if="activeProjectId && actions?.$el"
      mode="mini"
      :filter-query="filterQuery"
      :project-id="activeProjectId"
      :selected-item-ids="currentSelectedItemIds"
      :click-outside-exceptions="[actions?.$el as any]"
      @change-directory="changeDirectory"
      @update:selected-item-ids="
        spaceOperationsStore.setCurrentSelectedItemIds($event)
      "
    />
  </SidebarPanelLayout>
</template>

<style lang="postcss" scoped>
.actions {
  margin-left: auto;
}

.sidebar-space-explorer-panel-layout {
  padding-right: 0;
}

:deep(.space-explorer .virtual-scrollcontainer) {
  padding-right: var(--space-4);
}
</style>
