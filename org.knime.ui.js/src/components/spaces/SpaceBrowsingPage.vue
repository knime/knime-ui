<script setup lang="ts">
import { computed, watch } from "vue";

import { useStore } from "@/composables/useStore";
import { globalSpaceBrowserProjectId } from "@/store/spaces";

import SpacePageLayout from "./SpacePageLayout.vue";
import SpaceExplorer from "./SpaceExplorer.vue";
import SpaceExplorerActions from "./SpaceExplorerActions.vue";
import { useActiveRouteData } from "./useActiveRouteData";
import { usePageBreadcrumbs } from "./usePageBreadcrumbs";
import { useIcons } from "./useIcons";
import { useRoute } from "vue-router";

const store = useStore();

const currentSelectedItemIds = computed(
  () => store.state.spaces.currentSelectedItemIds,
);

const setCurrentSelectedItemIds = (items: string[]) => {
  store.commit("spaces/setCurrentSelectedItemIds", items);
};

const { activeSpaceProvider, activeSpaceGroup, activeSpace } =
  useActiveRouteData();

const $route = useRoute();
watch(
  () => $route.params.spaceId,
  () => {
    // This is required to sync between route params and store state
    store.commit("spaces/setProjectPath", {
      projectId: globalSpaceBrowserProjectId,
      value: {
        spaceId: activeSpace.value!.id,
        spaceProviderId: activeSpaceProvider.value!.id,
        itemId: "root",
      },
    });
  },
  { immediate: true },
);

const { breadcrumbs } = usePageBreadcrumbs();

const { getSpaceIcon } = useIcons();

const isHubProvider = computed<boolean>(() =>
  store.getters["spaces/isHubProvider"](globalSpaceBrowserProjectId),
);

const title = computed(() => {
  // for Hub providers return the name of the space
  if (isHubProvider.value) {
    return activeSpace.value?.name ?? "";
  }

  // local / server have a single space which is irrelevant, so just use provider name
  return activeSpaceProvider.value.name;
});

const hubSpaceIcon = computed(() => {
  if (!isHubProvider.value) {
    return null;
  }

  return getSpaceIcon(activeSpace.value!);
});
</script>

<template>
  <SpacePageLayout
    v-if="activeSpaceProvider && activeSpaceGroup"
    :title="title"
    :breadcrumbs="breadcrumbs"
  >
    <template v-if="hubSpaceIcon" #icon>
      <Component :is="hubSpaceIcon" />
    </template>

    <template #toolbar>
      <SpaceExplorerActions
        ref="actions"
        :project-id="globalSpaceBrowserProjectId"
        :selected-item-ids="currentSelectedItemIds"
        @imported-item-ids="setCurrentSelectedItemIds($event)"
      />
    </template>

    <template #content>
      <SpaceExplorer
        :project-id="globalSpaceBrowserProjectId"
        :selected-item-ids="currentSelectedItemIds"
        :click-outside-exception="$refs.actions as HTMLElement"
        @update:selected-item-ids="setCurrentSelectedItemIds($event)"
      />
    </template>
  </SpacePageLayout>
</template>
