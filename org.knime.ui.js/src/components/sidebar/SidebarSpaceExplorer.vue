<script lang="ts" setup>
import { computed, onUnmounted, ref } from "vue";

import SidebarPanelLayout from "@/components/common/side-panel/SidebarPanelLayout.vue";
import SidebarPanelScrollContainer from "@/components/common/side-panel/SidebarPanelScrollContainer.vue";
import SpaceExplorer from "@/components/spaces/SpaceExplorer.vue";
import SpaceExplorerActions from "@/components/spaces/SpaceExplorerActions.vue";
import SpaceSelectionDropdown from "@/components/spaces/SpaceSelectionDropdown.vue";
import { useStore } from "@/composables/useStore";

const store = useStore();
const activeProjectId = computed(() => store.state.application.activeProjectId);
const currentSelectedItemIds = computed(
  () => store.state.spaces.currentSelectedItemIds,
);

onUnmounted(() => {
  store.commit("spaces/setCurrentSelectedItemIds", []);
});

const filterQuery = ref("");

const changeDirectory = async (pathId: string) => {
  await store.dispatch("spaces/changeDirectory", {
    projectId: activeProjectId.value,
    pathId,
  });
  filterQuery.value = "";
};
</script>

<template>
  <SidebarPanelLayout>
    <template #header>
      <SpaceSelectionDropdown :project-id="activeProjectId!" />

      <SpaceExplorerActions
        ref="actions"
        v-model:filter-query="filterQuery"
        mode="mini"
        class="actions"
        :project-id="activeProjectId!"
        :selected-item-ids="currentSelectedItemIds"
        @imported-item-ids="
          store.commit('spaces/setCurrentSelectedItemIds', $event)
        "
      />
    </template>
    <SidebarPanelScrollContainer>
      <SpaceExplorer
        v-if="activeProjectId"
        mode="mini"
        :filter-query="filterQuery"
        :project-id="activeProjectId"
        :selected-item-ids="currentSelectedItemIds"
        :click-outside-exception="$refs.actions as HTMLElement"
        @change-directory="changeDirectory"
        @update:selected-item-ids="
          store.commit('spaces/setCurrentSelectedItemIds', $event)
        "
      />
    </SidebarPanelScrollContainer>
  </SidebarPanelLayout>
</template>

<style lang="postcss" scoped>
.actions {
  margin-left: auto;
}
</style>
