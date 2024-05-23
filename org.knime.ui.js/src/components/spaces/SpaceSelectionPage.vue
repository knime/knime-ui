<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";

import { APP_ROUTES } from "@/router";
import { useStore } from "@/composables/useStore";
import type { SpaceProviderNS } from "@/api/custom-types";
import { globalSpaceBrowserProjectId } from "@/store/spaces";

import SpacePageLayout from "./SpacePageLayout.vue";
import SpaceCard from "./SpaceCard.vue";
import { useActiveRouteData } from "./useActiveRouteData";
import { usePageBreadcrumbs } from "./usePageBreadcrumbs";
import { useIcons } from "./useIcons";

const store = useStore();
const $router = useRouter();
const $route = useRoute();

const { activeSpaceProvider, activeSpaceGroup } = useActiveRouteData();

const { breadcrumbs } = usePageBreadcrumbs();
const { getSpaceGroupIcon } = useIcons();

const onSpaceCardClick = (space: SpaceProviderNS.Space) => {
  store.commit("spaces/setProjectPath", {
    projectId: globalSpaceBrowserProjectId,
    value: {
      spaceId: space.id,
      spaceProviderId: activeSpaceProvider.value!.id,
      itemId: "root",
    },
  });

  $router.push({
    name: APP_ROUTES.Home.SpaceBrowsingPage,
    params: {
      spaceProviderId: activeSpaceProvider.value.id,
      groupId: $route.params.groupId,
      spaceId: space.id,
    },
  });
};
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

    <template #content>
      <div class="cards">
        <SpaceCard
          v-for="(space, id) of activeSpaceGroup.spaces"
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
