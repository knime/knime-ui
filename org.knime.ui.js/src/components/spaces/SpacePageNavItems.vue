<script setup lang="ts">
import { computed, watch } from "vue";
import { useRouter, useRoute } from "vue-router";

import { SpaceProviderNS } from "@/api/custom-types";
import type { SpaceGroup } from "@/api/gateway-api/generated-api";
import { APP_ROUTES } from "@/router/appRoutes";
import { useStore } from "@/composables/useStore";

import {
  SidebarNavItem,
  type SidebarNavItemType,
} from "@/components/common/side-nav";

import { useSpaceIcons } from "./useSpaceIcons";
import SpacePageNavItemsAuthButtons from "./SpacePageNavItemsAuthButtons.vue";

const store = useStore();
const $router = useRouter();
const $route = useRoute();

const emit = defineEmits<{
  loading: [value: boolean];
}>();

const spaceProviders = computed(() => store.state.spaces.spaceProviders);

const isLoadingProviders = computed(
  () => store.state.spaces.isLoadingProviders,
);

watch(
  isLoadingProviders,
  () => {
    emit("loading", isLoadingProviders.value);
  },
  { immediate: true },
);

const isHubProvider = (spaceProvider: SpaceProviderNS.SpaceProvider) => {
  return spaceProvider.type === SpaceProviderNS.TypeEnum.HUB;
};

const onProviderClick = (spaceProvider: SpaceProviderNS.SpaceProvider) => {
  if (isHubProvider(spaceProvider) || !spaceProvider.connected) {
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

type SpaceNavItem = SidebarNavItemType<{
  spaceProvider: SpaceProviderNS.SpaceProvider;
  spaceGroup?: SpaceProviderNS.SpaceGroup;
}>;

const items = computed<SpaceNavItem[]>(() =>
  Object.values(spaceProviders.value ?? {}).map((spaceProvider) => {
    const item: SpaceNavItem = {
      id: spaceProvider.id,
      text: spaceProvider.name,
      active: isSpaceProviderActive(spaceProvider.id),
      clickable: !isHubProvider(spaceProvider),
      onClick: () => onProviderClick(spaceProvider),
      hoverable: !isHubProvider(spaceProvider) && spaceProvider.connected,
      icon: getSpaceProviderIcon(spaceProvider),

      metadata: {
        spaceProvider,
      },

      children: isLoggedInHubProvider(spaceProvider)
        ? spaceProvider.spaceGroups.map((group) => ({
            id: group.id,
            text: group.name,
            active: isSpaceGroupActive(group.id),
            icon: getSpaceGroupIcon(group),
            clickable: true,
            onClick: () => onSpaceGroupClick(group, spaceProvider),

            metadata: {
              spaceProvider,
              spaceGroup: group,
            },
          }))
        : [],
    };

    return item;
  }),
);
</script>

<template>
  <SidebarNavItem v-for="item in items" :key="item.id" :item="item">
    <template #append>
      <SpacePageNavItemsAuthButtons :item="item" />
    </template>
  </SidebarNavItem>
</template>
