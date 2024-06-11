<script setup lang="ts">
import { computed } from "vue";
import { useRouter, useRoute } from "vue-router";

import { SpaceProviderNS } from "@/api/custom-types";
import type { SpaceGroup } from "@/api/gateway-api/generated-api";
import { APP_ROUTES } from "@/router/appRoutes";
import { useStore } from "@/composables/useStore";
import SkeletonItem from "@/components/common/skeleton-loader/SkeletonItem.vue";

import { isHubProvider } from "@/store/spaces/util";
import {
  NavMenu,
  NavMenuItem,
  type NavMenuItemType,
} from "@/components/common/side-nav";

import { useSpaceIcons } from "./useSpaceIcons";
import SpacePageNavItemsAuthButtons from "./SpacePageNavItemsAuthButtons.vue";

const store = useStore();
const $router = useRouter();
const $route = useRoute();

const spaceProviders = computed(() => store.state.spaces.spaceProviders);

const isLoadingProviders = computed(
  () => store.state.spaces.isLoadingProviders,
);

const onProviderClick = (spaceProvider: SpaceProviderNS.SpaceProvider) => {
  if (!spaceProvider.connected) {
    return;
  }

  if (isHubProvider(spaceProvider)) {
    $router.push({
      name: APP_ROUTES.Home.SpaceSelectionPage,
      params: {
        spaceProviderId: spaceProvider.id,
        groupId: "all",
      },
    });

    return;
  }

  // local and server providers have a single group with a single space
  const spaceGroup = spaceProvider.spaceGroups.at(0)!;
  const spaceId = spaceGroup.spaces.at(0)!.id;

  $router.push({
    name: APP_ROUTES.Home.SpaceBrowsingPage,
    params: {
      spaceProviderId: spaceProvider.id,
      groupId: spaceGroup.id,
      spaceId,
      itemId: "root",
    },
  });
};

const onSpaceGroupClick = (
  group: SpaceGroup,
  spaceProvider: SpaceProviderNS.SpaceProvider,
) => {
  $router.push({
    name: APP_ROUTES.Home.SpaceSelectionPage,
    params: { spaceProviderId: spaceProvider.id, groupId: group.id },
  });
};

const isSpaceProviderActive = (spaceProviderId: string) =>
  spaceProviderId === $route.params.spaceProviderId;

const isSpaceGroupActive = (groupId: string) =>
  groupId === $route.params.groupId;

const { getSpaceProviderIcon, getSpaceGroupIcon } = useSpaceIcons();

const isLoggedInHubProvider = (spaceProvider: SpaceProviderNS.SpaceProvider) =>
  isHubProvider(spaceProvider) && spaceProvider.spaceGroups;

type ProviderNavItems = NavMenuItemType<{
  spaceProvider: SpaceProviderNS.SpaceProvider;
}>;
type GroupsNavItems = NavMenuItemType<{
  spaceGroup?: SpaceProviderNS.SpaceGroup;
}>;

const getItemsForSpaceGroups = (
  spaceProvider: SpaceProviderNS.SpaceProvider,
): GroupsNavItems[] => {
  return isLoggedInHubProvider(spaceProvider)
    ? spaceProvider.spaceGroups.map((group) => ({
        id: group.id,
        text: group.name,
        active: isSpaceGroupActive(group.id),
        onClick: (event) => {
          event.stopPropagation();
          onSpaceGroupClick(group, spaceProvider);
        },
        metadata: { spaceGroup: group },
      }))
    : [];
};

const providerItems = computed<ProviderNavItems[]>(() =>
  Object.values(spaceProviders.value ?? {}).map((spaceProvider) => {
    const item: ProviderNavItems = {
      id: spaceProvider.id,
      text: spaceProvider.name,
      active: isSpaceProviderActive(spaceProvider.id),
      onClick: () => onProviderClick(spaceProvider),
      metadata: { spaceProvider },
    };

    return item;
  }),
);
</script>

<template>
  <NavMenuItem v-for="item in providerItems" :key="item.id" :item="item">
    <template #prepend>
      <Component :is="getSpaceProviderIcon(item.metadata!.spaceProvider!)" />
    </template>

    <template #append>
      <SpacePageNavItemsAuthButtons :item="item" />
    </template>

    <template
      v-if="isLoggedInHubProvider(item.metadata!.spaceProvider!)"
      #children
    >
      <NavMenu>
        <NavMenuItem
          v-for="child in getItemsForSpaceGroups(item.metadata!.spaceProvider!)"
          :key="child.id"
          :item="child"
        >
          <template #prepend>
            <Component :is="getSpaceGroupIcon(child.metadata!.spaceGroup!)" />
          </template>
        </NavMenuItem>
      </NavMenu>
    </template>
  </NavMenuItem>

  <div v-if="isLoadingProviders" class="menu-skeleton">
    <div v-for="index in 4" :key="index" class="menu-skeleton-item">
      <div class="skeleton-list">
        <SkeletonItem
          :color1="$colors.SilverSandSemi"
          width="70%"
          height="24px"
        />
        <SkeletonItem
          :color1="$colors.SilverSandSemi"
          width="70px"
          height="24px"
          type="button"
        />
      </div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.menu-skeleton {
  padding: 0;

  & .menu-skeleton-item {
    display: flex;
    flex-direction: column;

    & .skeleton-list {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      padding: 5px 8px 8px;
    }
  }
}
</style>
