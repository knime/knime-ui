<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";

import { APP_ROUTES } from "@/router/appRoutes";
import { useSpaceCachingStore } from "@/store/spaces/caching";
import { globalSpaceBrowserProjectId } from "@/store/spaces/common";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";
import { isHubProvider } from "@/store/spaces/util";
import { getToastPresets } from "@/toastPresets";

import SpaceExplorer from "./SpaceExplorer.vue";
import SpaceExplorerActions from "./SpaceExplorerActions.vue";
import SpacePageHeader from "./SpacePageHeader.vue";
import SpacePageLayout from "./SpacePageLayout.vue";
import { useActiveRouteData } from "./useActiveRouteData";
import { usePageBreadcrumbs } from "./usePageBreadcrumbs";
import { useSpaceIcons } from "./useSpaceIcons";

const { currentSelectedItemIds, pathToItemId } = storeToRefs(
  useSpaceOperationsStore(),
);
const { toastPresets } = getToastPresets();
const { setCurrentSelectedItemIds, renameSpace } = useSpaceOperationsStore();
const { setProjectPath } = useSpaceCachingStore();
const $route = useRoute();
const $router = useRouter();

const actions = useTemplateRef("actions");

const { activeSpaceProvider, activeSpaceGroup, activeSpace } =
  useActiveRouteData();

watch(
  [
    () => $route.params.spaceId,
    () => $route.params.spaceProviderId,
    () => $route.params.itemId,
  ],
  () => {
    if (!activeSpaceProvider.value || !activeSpace.value) {
      return;
    }

    // This is required to sync between route params and store state
    setProjectPath({
      projectId: globalSpaceBrowserProjectId,
      value: {
        spaceId: activeSpace.value.id,
        spaceProviderId: activeSpaceProvider.value.id,
        itemId: $route.params.itemId as string,
      },
    });
  },
  { immediate: true },
);

const filterQuery = ref("");

const changeDirectory = async (pathId: string) => {
  const itemId = pathToItemId.value(globalSpaceBrowserProjectId, pathId);

  filterQuery.value = "";

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
  if (!activeSpaceProvider.value) {
    return "";
  }

  // for Hub providers return the name of the space
  if (isHubProvider(activeSpaceProvider.value)) {
    return activeSpace.value?.name ?? "";
  }

  // local / server have a single space which is irrelevant, so just use provider name
  return activeSpaceProvider.value.name;
});

const hubSpaceIcon = computed(() => {
  if (
    !activeSpaceProvider.value ||
    !isHubProvider(activeSpaceProvider.value) ||
    !activeSpace.value
  ) {
    return null;
  }

  return getSpaceIcon(activeSpace.value);
});

const existingSpaceNames = computed<Array<string>>(() => {
  return (
    activeSpaceGroup.value?.spaces
      .filter((space) => space.name !== activeSpace.value?.name)
      .map((space) => space.name) ?? []
  );
});

const errorOnHeader = ref("");
const isEditing = ref(false);

const onRenameSpace = (name: string) => {
  if (!activeSpaceProvider.value) {
    return;
  }

  errorOnHeader.value = "";
  renameSpace({
    spaceProviderId: activeSpaceProvider.value.id,
    spaceId: activeSpace.value!.id,
    spaceName: name,
  }).catch((error) => {
    errorOnHeader.value = error.message;
    isEditing.value = true;
    toastPresets.spaces.crud.renameSpaceFailed({ error });
  });
};
</script>

<template>
  <SpacePageLayout v-if="activeSpaceProvider && activeSpaceGroup">
    <template #header>
      <SpacePageHeader
        v-model:is-editing="isEditing"
        :title="title"
        :breadcrumbs="breadcrumbs"
        :is-editable="isHubProvider(activeSpaceProvider)"
        :blacklisted-names="existingSpaceNames"
        :error="errorOnHeader"
        @submit="onRenameSpace"
        @cancel="errorOnHeader = ''"
      >
        <template v-if="hubSpaceIcon" #icon>
          <Component :is="hubSpaceIcon" />
        </template>
      </SpacePageHeader>
    </template>

    <template #toolbar>
      <SpaceExplorerActions
        ref="actions"
        v-model:filter-query="filterQuery"
        class="space-explorer-actions"
        :project-id="globalSpaceBrowserProjectId"
        :selected-item-ids="currentSelectedItemIds"
      />
    </template>

    <template #content>
      <SpaceExplorer
        v-if="actions?.$el"
        :project-id="globalSpaceBrowserProjectId"
        :selected-item-ids="currentSelectedItemIds"
        :filter-query="filterQuery"
        :click-outside-exceptions="[actions?.$el as any]"
        @change-directory="changeDirectory"
        @update:selected-item-ids="setCurrentSelectedItemIds($event)"
      />
    </template>
  </SpacePageLayout>
</template>

<style lang="postcss" scoped>
@media only screen and (max-width: 1420px) {
  .space-explorer-actions {
    & :deep(.toolbar-actions-normal) {
      & .text {
        display: none;
      }

      & .button {
        & svg {
          margin-right: 0;
          top: 0;
        }

        &.compact {
          min-width: auto;
          padding: 5px;
        }
      }
    }
  }
}
</style>
