<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

import { APP_ROUTES } from "@/router/appRoutes";
import { useStore } from "@/composables/useStore";
import type { SpaceProviderNS } from "@/api/custom-types";

import SpacePageLayout from "./SpacePageLayout.vue";
import SpacePageHeader from "./SpacePageHeader.vue";
import SpaceCard from "./SpaceCard.vue";
import SpaceExplorerFloatingButton from "./SpaceExplorerFloatingButton.vue";

import { useActiveRouteData } from "./useActiveRouteData";
import { usePageBreadcrumbs } from "./usePageBreadcrumbs";
import { useSpaceIcons } from "./useSpaceIcons";
import SearchButton from "@/components/common/SearchButton.vue";
import { matchesQuery } from "@/util/matchesQuery";
import { formatSpaceProviderName } from "./formatSpaceProviderName";

type SpaceWithGroupId = SpaceProviderNS.Space & { groupId: string };

const $router = useRouter();
const store = useStore();

const { activeSpaceProvider, activeSpaceGroup, isShowingAllSpaces } =
  useActiveRouteData();

const { breadcrumbs } = usePageBreadcrumbs();
const { getSpaceGroupIcon, getSpaceProviderIcon } = useSpaceIcons();

const onSpaceCardClick = (space: SpaceWithGroupId) => {
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

const title = computed(() =>
  isShowingAllSpaces.value
    ? `Spaces of ${formatSpaceProviderName(activeSpaceProvider.value)}`
    : activeSpaceGroup.value?.name ?? "",
);

const icon = computed(() =>
  isShowingAllSpaces.value
    ? getSpaceProviderIcon(activeSpaceProvider.value)
    : activeSpaceGroup.value && getSpaceGroupIcon(activeSpaceGroup.value),
);

const createSpace = () => {
  isCreateSpaceDisabled.value = true;
  store.dispatch("spaces/createSpace", {
    spaceProviderId: activeSpaceProvider.value.id,
    spaceGroup: activeSpaceGroup.value,
    $router,
  });
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
      <SpaceExplorerFloatingButton
        v-if="!isShowingAllSpaces"
        :disabled="isCreateSpaceDisabled"
        title="Create new space"
        @click="createSpace"
      />
    </template>

    <template #content>
      <div class="cards">
        <SpaceCard
          v-for="(space, id) of filteredSpaces"
          :key="id"
          :space="space"
          @click="onSpaceCardClick(space)"
        />
      </div>
    </template>
  </SpacePageLayout>
</template>

<style lang="postcss" scoped>
.cards {
  display: grid;
  gap: 24px;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
}

:deep(.search-button-input) {
  width: 300px;
}
</style>
