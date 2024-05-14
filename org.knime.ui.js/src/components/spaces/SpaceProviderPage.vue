<script setup lang="ts">
import { computed } from "vue";
import ServerIcon from "webapps-common/ui/assets/img/icons/server-racks.svg";
import PageHeader from "@/components/common/PageHeader.vue";
import SpaceExplorer from "./SpaceExplorer.vue";
import SpaceCard from "./SpaceCard.vue";
import SpaceExplorerActions from "./SpaceExplorerActions.vue";
import ComputerDesktopIcon from "@/assets/computer-desktop.svg";
import { useStore } from "@/composables/useStore";
import {
  globalSpaceBrowserProjectId,
  cachedLocalSpaceProjectId,
} from "@/store/spaces";

const store = useStore();

const activeSpaceProvider = computed(
  () => store.state.spaces.activeSpaceProvider,
);
const currentSelectedItemIds = computed(
  () => store.state.spaces.currentSelectedItemIds,
);

const activeSpaceInfo = computed(() => {
  return store.getters["spaces/getSpaceInfo"](globalSpaceBrowserProjectId);
});

const isLocal = computed(() => {
  return activeSpaceProvider.value.id === "local";
});

const providerInfo = computed(() => {
  if (isLocal.value) {
    return {
      title: "Your local space",
      subtitle: "Local space",
      icon: ComputerDesktopIcon,
    };
  }

  // if (activeSpaceProvider.value?.id === "local") {
  //   return {
  //     title: "Your local space",
  //     subtitle: "Local space",
  //     icon: ComputerDesktopIcon,
  //   };
  // }

  return {
    title: activeSpaceProvider.value?.id,
    subtitle: "Server space",
    icon: ServerIcon,
  };
});

const setCurrentSelectedItemIds = (items: string[]) => {
  store.commit("spaces/setCurrentSelectedItemIds", items);
};

const onSpaceCardClick = (spaceId) => {
  store.commit("spaces/setProjectPath", {
    projectId: globalSpaceBrowserProjectId,
    value: {
      spaceId,
      spaceProviderId: activeSpaceProvider.value.id,
      itemId: "root",
    },
  });
  // this.$router.push({ name: APP_ROUTES.SpaceBrowsingPage });
};
</script>

<template>
  <main ref="main">
    <PageHeader :title="providerInfo.title" :subtitle="providerInfo.subtitle">
      <template #icon>
        <Component :is="providerInfo.icon" />
      </template>
    </PageHeader>

    <div class="toolbar-wrapper">
      <SpaceExplorerActions
        v-if="isLocal"
        ref="actions"
        :project-id="cachedLocalSpaceProjectId"
        :selected-item-ids="currentSelectedItemIds"
        @imported-item-ids="setCurrentSelectedItemIds($event)"
      />
    </div>

    <div class="space-explorer-wrapper">
      <div v-if="isLocal">
        <SpaceExplorer
          :project-id="cachedLocalSpaceProjectId"
          :selected-item-ids="currentSelectedItemIds"
          :click-outside-exception="$refs.actions"
          @update:selected-item-ids="setCurrentSelectedItemIds($event)"
        />
      </div>
      <div v-else>
        <div class="cards">
          <SpaceCard
            v-for="(space, id) of activeSpaceProvider?.spaceGroups"
            :key="id"
            :space="space"
            @click="onSpaceCardClick(id)"
          />
        </div>
      </div>
    </div>
  </main>
</template>

<style lang="postcss" scoped>
main {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--knime-gray-ultra-light);
  border-left: 1px solid var(--knime-silver-sand);
  overflow-y: scroll;
  overflow-x: hidden;

  & header {
    margin-top: 0px;
    padding: 30px;
  }

  & .toolbar-wrapper {
    min-height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--knime-porcelain);
    border-top: 1px solid var(--knime-silver-sand);
    border-bottom: 1px solid var(--knime-silver-sand);

    /* & .toolbar {
      display: flex;
      align-items: center;
      justify-content: flex-end;
    } */
  }

  & .space-explorer-wrapper {
    padding: 30px;
  }

  & .cards {
    display: grid;
    gap: 24px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
