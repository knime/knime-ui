<script setup lang="ts">
import { computed } from "vue";
import { useRouter, useRoute } from "vue-router";

import { FunctionButton, LoadingIcon } from "@knime/components";
import LeaveIcon from "@knime/styles/img/icons/leave.svg";

import { SpaceProviderNS } from "@/api/custom-types";
import type { SpaceGroup } from "@/api/gateway-api/generated-api";
import { APP_ROUTES } from "@/router/appRoutes";
import { useStore } from "@/composables/useStore";
import SkeletonItem from "@/components/common/skeleton-loader/SkeletonItem.vue";

import { isHubProvider } from "@/store/spaces/util";
import {
  NavMenu,
  NavMenuItem,
  type NavMenuItemProps,
} from "@/components/common/side-nav";

import { useSpaceIcons } from "./useSpaceIcons";
import { useSpaceProviderAuth } from "./useSpaceProviderAuth";
import { formatSpaceProviderName } from "./formatSpaceProviderName";

const store = useStore();
const $router = useRouter();
const $route = useRoute();

const spaceProviders = computed(() => store.state.spaces.spaceProviders);

const isLoadingProviders = computed(
  () => store.state.spaces.isLoadingProviders,
);

const {
  connectAndNavigate,
  shouldShowLoginIndicator,
  shouldShowLogout,
  isAuthDisabled,
  logout,
  isConnectingToProvider,
} = useSpaceProviderAuth();

const onProviderClick = (spaceProvider: SpaceProviderNS.SpaceProvider) => {
  if (isConnectingToProvider.value === spaceProvider.id) {
    return;
  }

  if (!spaceProvider.connected) {
    connectAndNavigate(spaceProvider);
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

type SpaceProviderNavItems = NavMenuItemProps & {
  id: string;
  onClick: () => void;
  metadata: { spaceProvider: SpaceProviderNS.SpaceProvider };
};

type SpaceGroupsNavItems = NavMenuItemProps & {
  id: string;
  onClick: (event: MouseEvent | KeyboardEvent) => void;
  metadata: { spaceGroup: SpaceProviderNS.SpaceGroup };
};

const getItemsForSpaceGroups = (
  spaceProvider: SpaceProviderNS.SpaceProvider,
): SpaceGroupsNavItems[] => {
  return isLoggedInHubProvider(spaceProvider)
    ? spaceProvider.spaceGroups.map((group) => ({
        id: group.id,
        text: group.name,
        active: isSpaceGroupActive(group.id),
        highlighted: isSpaceGroupActive(group.id),
        onClick: (event) => {
          event.stopPropagation();
          onSpaceGroupClick(group, spaceProvider);
        },
        metadata: { spaceGroup: group },
      }))
    : [];
};

const providerItems = computed<SpaceProviderNavItems[]>(() =>
  Object.values(spaceProviders.value ?? {}).map((spaceProvider) => {
    const item: SpaceProviderNavItems = {
      id: spaceProvider.id,
      text: formatSpaceProviderName(spaceProvider),
      active: isSpaceProviderActive(spaceProvider.id),
      withIndicator: isSpaceProviderActive(spaceProvider.id),
      highlighted:
        isSpaceProviderActive(spaceProvider.id) &&
        getItemsForSpaceGroups(spaceProvider).every((item) => !item.active),
      onClick: () => onProviderClick(spaceProvider),
      metadata: { spaceProvider },
    };

    return item;
  }),
);
</script>

<template>
  <NavMenuItem
    v-for="item in providerItems"
    :key="item.id"
    :text="item.text"
    :active="item.active"
    :highlighted="item.highlighted"
    :with-indicator="item.withIndicator"
    @click="item.onClick()"
  >
    <template #prepend>
      <Component :is="getSpaceProviderIcon(item.metadata.spaceProvider!)" />
    </template>

    <template #append="{ isItemHovered }">
      <span
        v-if="
          isItemHovered && shouldShowLoginIndicator(item.metadata.spaceProvider)
        "
        class="login-indicator"
      >
        Connect
      </span>

      <LoadingIcon
        v-if="isConnectingToProvider === item.metadata.spaceProvider.id"
        class="loading-indicator"
      />

      <FunctionButton
        v-if="shouldShowLogout(item.metadata.spaceProvider)"
        compact
        :disabled="isAuthDisabled"
        @click.stop.prevent="logout(item.metadata.spaceProvider)"
      >
        <LeaveIcon />
      </FunctionButton>
    </template>

    <template
      v-if="isLoggedInHubProvider(item.metadata.spaceProvider!)"
      #children
    >
      <NavMenu>
        <NavMenuItem
          v-for="child in getItemsForSpaceGroups(item.metadata.spaceProvider!)"
          :key="child.id"
          :text="child.text"
          :active="child.active"
          :highlighted="child.highlighted"
          :with-indicator="child.withIndicator"
          @click="child.onClick($event)"
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

.login-indicator {
  color: var(--knime-dove-gray);
  font-weight: 400;
  font-size: 13px;
}

.loading-indicator {
  margin-right: 8px;
}
</style>
