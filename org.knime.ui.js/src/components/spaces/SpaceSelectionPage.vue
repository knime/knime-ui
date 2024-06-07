<script setup lang="ts">
import { computed, ref, nextTick } from "vue";
import { useRouter } from "vue-router";

import { APP_ROUTES } from "@/router/appRoutes";
import type { SpaceProviderNS } from "@/api/custom-types";

import SpacePageLayout from "./SpacePageLayout.vue";
import SpaceCard from "./SpaceCard.vue";
import { useActiveRouteData } from "./useActiveRouteData";
import { usePageBreadcrumbs } from "./usePageBreadcrumbs";
import { useSpaceIcons } from "./useSpaceIcons";
import InputField from "webapps-common/ui/components/forms/InputField.vue";
import FunctionButton from "webapps-common/ui/components/FunctionButton.vue";
import LensIcon from "webapps-common/ui/assets/img/icons/lens.svg";

type SpaceWithGroupId = SpaceProviderNS.Space & { groupId: string };

const $router = useRouter();

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

const matchesQuery = (input: string) =>
  new RegExp(query.value, "i").test(input);

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
      matchesQuery(name) || matchesQuery(description ?? ""),
  ),
);

const title = computed(() =>
  isShowingAllSpaces.value
    ? `Spaces of ${activeSpaceProvider.value.name}`
    : activeSpaceGroup.value?.name ?? "",
);

const icon = computed(() =>
  isShowingAllSpaces.value
    ? getSpaceProviderIcon(activeSpaceProvider.value)
    : getSpaceGroupIcon(activeSpaceGroup.value!),
);

const filterInput = ref<HTMLElement>();
const showFilter = ref(false);
const toggleFilterInput = async () => {
  if (showFilter.value) {
    showFilter.value = false;
    query.value = "";
    return;
  }
  showFilter.value = true;
  await nextTick();
  filterInput.value?.focus();
};
</script>

<template>
  <SpacePageLayout :title="title" :breadcrumbs="breadcrumbs">
    <template #icon>
      <Component :is="icon" />
    </template>

    <template #toolbar>
      <InputField
        v-if="showFilter"
        ref="filterInput"
        v-model="query"
        placeholder="Search"
        class="filter-input"
        tabindex="-1"
      />
      <FunctionButton
        class="filter-button"
        :active="showFilter"
        @click="toggleFilterInput"
      >
        <LensIcon />
      </FunctionButton>
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

.filter-input {
  height: 30px;
  margin-right: 5px;
  width: 30%;
  min-width: 150px;
  max-width: 350px;
}
</style>
