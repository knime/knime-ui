<script setup lang="ts">
import { computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useStore } from "@/composables/useStore";
import { globalSpaceBrowserProjectId } from "@/store/spaces";
import { isHubProvider } from "@/store/spaces/util";

import { APP_ROUTES } from "@/router/appRoutes";
import SpacePageLayout from "./SpacePageLayout.vue";
import SpaceExplorer from "./SpaceExplorer.vue";
import SpaceExplorerActions from "./SpaceExplorerActions.vue";
import { useActiveRouteData } from "./useActiveRouteData";
import { usePageBreadcrumbs } from "./usePageBreadcrumbs";
import { useSpaceIcons } from "./useSpaceIcons";

const store = useStore();
const $route = useRoute();
const $router = useRouter();

const currentSelectedItemIds = computed(
  () => store.state.spaces.currentSelectedItemIds,
);

const setCurrentSelectedItemIds = (items: string[]) => {
  store.commit("spaces/setCurrentSelectedItemIds", items);
};

const { activeSpaceProvider, activeSpaceGroup, activeSpace } =
  useActiveRouteData();

watch(
  [
    () => $route.params.spaceId,
    () => $route.params.spaceProviderId,
    () => $route.params.itemId,
  ],
  () => {
    // This is required to sync between route params and store state
    store.commit("spaces/setProjectPath", {
      projectId: globalSpaceBrowserProjectId,
      value: {
        spaceId: activeSpace.value!.id,
        spaceProviderId: activeSpaceProvider.value!.id,
        itemId: $route.params.itemId,
      },
    });
  },
  { immediate: true },
);

const changeDirectory = async (pathId: string) => {
  const itemId = store.getters["spaces/pathToItemId"](
    globalSpaceBrowserProjectId,
    pathId,
  );

  // this synced from changes to route
  const { spaceProviderId, spaceId, groupId } = $route.params;

  await $router.push({
    name: APP_ROUTES.Home.SpaceBrowsingPage,
    params: {
      spaceProviderId,
      spaceId,
      groupId,
      itemId,
    },
  });
};

const { breadcrumbs } = usePageBreadcrumbs();

const { getSpaceIcon } = useSpaceIcons();

const title = computed(() => {
  // for Hub providers return the name of the space
  if (isHubProvider(activeSpaceProvider.value)) {
    return activeSpace.value?.name ?? "";
  }

  // local / server have a single space which is irrelevant, so just use provider name
  return activeSpaceProvider.value.name;
});

const hubSpaceIcon = computed(() => {
  if (!isHubProvider(activeSpaceProvider.value)) {
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
        @change-directory="changeDirectory"
        @update:selected-item-ids="setCurrentSelectedItemIds($event)"
      />
    </template>
  </SpacePageLayout>
</template>
