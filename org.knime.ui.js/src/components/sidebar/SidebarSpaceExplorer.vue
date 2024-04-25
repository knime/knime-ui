<script lang="ts" setup>
import { computed, onUnmounted } from "vue";

import SidebarPanelLayout from "@/components/common/side-panel/SidebarPanelLayout.vue";
import SidebarPanelScrollContainer from "@/components/common/side-panel/SidebarPanelScrollContainer.vue";
import SpaceExplorer from "@/components/spaces/SpaceExplorer.vue";
import SpaceSelectionDropdown from "@/components/spaces/SpaceSelectionDropdown.vue";
import SpaceExplorerActions from "@/components/spaces/SpaceExplorerActions.vue";

import { useStore } from "@/composables/useStore";

const store = useStore();
const activeProjectId = computed(() => store.state.application.activeProjectId);
const currentSelectedItemIds = computed(
  () => store.state.spaces.currentSelectedItemIds,
);

onUnmounted(() => {
  store.commit("spaces/setCurrentSelectedItemIds", []);
});
</script>

<template>
  <SidebarPanelLayout>
    <template #header>
      <SpaceSelectionDropdown :project-id="activeProjectId!" />

      <SpaceExplorerActions
        ref="actions"
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
        :project-id="activeProjectId"
        :selected-item-ids="currentSelectedItemIds"
        :click-outside-exception="$refs.actions as HTMLElement"
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
