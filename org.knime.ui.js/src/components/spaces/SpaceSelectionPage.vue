<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

import { FunctionButton } from "@knime/components";
import ReloadIcon from "@knime/styles/img/icons/reload.svg";

import type { SpaceProviderNS } from "@/api/custom-types";
import SearchButton from "@/components/common/SearchButton.vue";
import SkeletonItem from "@/components/common/skeleton-loader/SkeletonItem.vue";
import { matchesQuery } from "@/lib/search";
import { APP_ROUTES } from "@/router/appRoutes";
import { getToastPresets } from "@/services/toastPresets";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";
import { formatSpaceProviderName } from "@/store/spaces/util";

import SpaceCard from "./SpaceCard.vue";
import SpaceExplorerFloatingButton from "./SpaceExplorerFloatingButton.vue";
import SpacePageHeader from "./SpacePageHeader.vue";
import SpacePageLayout from "./SpacePageLayout.vue";
import { useActiveRouteData } from "./useActiveRouteData";
import { usePageBreadcrumbs } from "./usePageBreadcrumbs";
import { useSpaceIcons } from "./useSpaceIcons";

type SpaceWithGroupId = SpaceProviderNS.Space & { groupId: string };

const { createSpace } = useSpaceOperationsStore();
const { reloadProviderSpaces } = useSpaceProvidersStore();
const $router = useRouter();

const {
  activeSpaceProvider,
  activeSpaceGroup,
  isShowingAllSpaces,
  isLoadingSpacesData,
} = useActiveRouteData();

const { breadcrumbs } = usePageBreadcrumbs();
const { getSpaceGroupIcon, getSpaceProviderIcon } = useSpaceIcons();

const onSpaceCardClick = (space: SpaceWithGroupId) => {
  if (!activeSpaceProvider.value) {
    return;
  }

  $router.push({
    name: APP_ROUTES.Home.SpaceBrowsingPage,
    params: {
      spaceProviderId: activeSpaceProvider.value.id,
      groupId: space.groupId,
      spaceId: space.id,
      itemId: "root",
    },
  });
};

const query = ref("");

const isCreateSpaceDisabled = ref(false);

const toSpaceWithGroupId =
  (groupId: string) =>
  (space: SpaceProviderNS.Space): SpaceWithGroupId => ({ ...space, groupId });

const allSpaces = computed<Array<SpaceWithGroupId>>(() => {
  if (!activeSpaceProvider.value) {
    return [];
  }

  const spacesFromAllGroups = activeSpaceProvider.value.spaceGroups.flatMap(
    ({ spaces, id }) => spaces.map(toSpaceWithGroupId(id)),
  );

  const activeGroupSpaces = (activeSpaceGroup.value?.spaces ?? []).map(
    toSpaceWithGroupId(activeSpaceGroup.value?.id ?? ""),
  );

  return isShowingAllSpaces.value ? spacesFromAllGroups : activeGroupSpaces;
});

const filteredSpaces = computed(() =>
  allSpaces.value.filter(
    ({ name, description }) =>
      matchesQuery(query.value, name) ||
      matchesQuery(query.value, description ?? ""),
  ),
);

const title = computed(() => {
  if (!activeSpaceProvider.value) {
    return "";
  }

  return isShowingAllSpaces.value
    ? `Spaces of ${formatSpaceProviderName(activeSpaceProvider.value)}`
    : activeSpaceGroup.value?.name ?? "";
});

const icon = computed(() => {
  if (!activeSpaceProvider.value) {
    return null;
  }

  return isShowingAllSpaces.value
    ? getSpaceProviderIcon(activeSpaceProvider.value)
    : activeSpaceGroup.value && getSpaceGroupIcon(activeSpaceGroup.value);
});

const { toastPresets } = getToastPresets();

const onSpaceExplorerFloatingButtonClick = async () => {
  if (!activeSpaceProvider.value) {
    return;
  }

  isCreateSpaceDisabled.value = true;

  try {
    await createSpace({
      spaceProviderId: activeSpaceProvider.value.id,
      spaceGroup: activeSpaceGroup.value!,
      $router,
    });
  } catch (error) {
    toastPresets.spaces.crud.createSpaceFailed({ error });
  } finally {
    isCreateSpaceDisabled.value = false;
  }
};

const reload = async () => {
  if (!activeSpaceProvider.value) {
    return;
  }

  try {
    await reloadProviderSpaces({ id: activeSpaceProvider.value.id });
  } catch (error) {
    toastPresets.spaces.crud.reloadProviderSpacesFailed({ error });
  }
};
</script>

<template>
  <SpacePageLayout>
    <template #header>
      <SpacePageHeader
        :title="title"
        :breadcrumbs="breadcrumbs"
        :is-editable="false"
      >
        <template #icon>
          <Component :is="icon" />
        </template>
      </SpacePageHeader>
    </template>

    <template #toolbar>
      <SearchButton v-model="query" />
      <FunctionButton class="reload-button" @click="reload">
        <ReloadIcon />
      </FunctionButton>
      <SpaceExplorerFloatingButton
        v-if="!isShowingAllSpaces"
        :disabled="isCreateSpaceDisabled"
        title="Create new space"
        @click="onSpaceExplorerFloatingButtonClick"
      />
    </template>

    <template #content>
      <template v-if="activeSpaceProvider?.spaceGroups.length === 0">
        <div class="no-space-groups">
          <span
            >You are not a member of any team, yet. To get started ask an admin
            to assign you to a team.</span
          >
        </div>
      </template>
      <div class="cards">
        <template v-if="!isLoadingSpacesData">
          <SpaceCard
            v-for="(space, id) of filteredSpaces"
            :key="id"
            :space="space"
            @click="onSpaceCardClick(space)"
          />
        </template>

        <template v-else>
          <SkeletonItem
            style="box-shadow: var(--shadow-elevation-1)"
            height="230px"
          />

          <SkeletonItem
            style="box-shadow: var(--shadow-elevation-1)"
            height="230px"
          />

          <SkeletonItem
            style="box-shadow: var(--shadow-elevation-1)"
            height="230px"
          />
        </template>
      </div>
    </template>
  </SpacePageLayout>
</template>

<style lang="postcss" scoped>
.no-space-groups {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.cards {
  display: grid;
  gap: 24px;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
}

:deep(.search-button-input) {
  width: 300px;
}

.reload-button {
  margin-left: var(--space-4);
}
</style>
