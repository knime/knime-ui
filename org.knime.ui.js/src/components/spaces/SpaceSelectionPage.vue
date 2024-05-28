<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import SearchInput from "webapps-common/ui/components/forms/SearchInput.vue";

import { APP_ROUTES } from "@/router/appRoutes";
import type { SpaceProviderNS } from "@/api/custom-types";

import SpacePageLayout from "./SpacePageLayout.vue";
import SpaceCard from "./SpaceCard.vue";
import { useActiveRouteData } from "./useActiveRouteData";
import { usePageBreadcrumbs } from "./usePageBreadcrumbs";
import { useSpaceIcons } from "./useSpaceIcons";

const $router = useRouter();
const $route = useRoute();

const { activeSpaceProvider, activeSpaceGroup } = useActiveRouteData();

const { breadcrumbs } = usePageBreadcrumbs();
const { getSpaceGroupIcon } = useSpaceIcons();

const onSpaceCardClick = (space: SpaceProviderNS.Space) => {
  $router.push({
    name: APP_ROUTES.Home.SpaceBrowsingPage,
    params: {
      spaceProviderId: activeSpaceProvider.value.id,
      groupId: $route.params.groupId,
      spaceId: space.id,
    },
  });
};

const query = ref("");

const matchesQuery = (input: string) =>
  input.toLowerCase().includes(query.value.toLowerCase());

const filteredSpaces = computed(
  () =>
    activeSpaceGroup.value?.spaces.filter(
      ({ name, description }) =>
        matchesQuery(name) || matchesQuery(description ?? ""),
    ),
);
</script>

<template>
  <SpacePageLayout
    v-if="activeSpaceGroup"
    :title="activeSpaceGroup.name"
    :breadcrumbs="breadcrumbs"
  >
    <template #icon>
      <Component :is="getSpaceGroupIcon(activeSpaceGroup)" />
    </template>

    <template #toolbar>
      <SearchInput
        v-model="query"
        placeholder="Search"
        class="search-bar"
        tabindex="-1"
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
</style>
