<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import {
  type RouteLocationRaw,
  RouterLink,
  useRoute,
  useRouter,
} from "vue-router";

import {
  FunctionButton,
  LoadingIcon,
  NavMenu,
  NavMenuItem,
  type NavMenuItemProps,
} from "@knime/components";
import LeaveIcon from "@knime/styles/img/icons/leave.svg";
import LinkExternalIcon from "@knime/styles/img/icons/link-external.svg";

import { SpaceProviderNS } from "@/api/custom-types";
import { knimeExternalUrls } from "@/plugins/knimeExternalUrls";
import { APP_ROUTES } from "@/router/appRoutes";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import {
  formatSpaceProviderName,
  isCommunityHubProvider,
  isHubProvider,
} from "@/store/spaces/util";

import { useSpaceIcons } from "./useSpaceIcons";
import { useSpaceProviderAuth } from "./useSpaceProviderAuth";

const $router = useRouter();
const $route = useRoute();

const { spaceProviders, getCommunityHubInfo, loadingProviderSpacesData } =
  storeToRefs(useSpaceProvidersStore());
const {
  isConnectingToProvider,
  shouldShowLoading,
  connectAndNavigate,
  shouldShowLoginIndicator,
  shouldShowLogout,
  logout,
} = useSpaceProviderAuth();

const { KNIME_PRO_URL } = knimeExternalUrls;

const shouldShowCreateTeamOption = (
  provider: SpaceProviderNS.SpaceProvider,
): boolean => {
  // Only show if it's the Community Hub (not Business Hub)
  if (
    !isCommunityHubProvider(provider) ||
    !getCommunityHubInfo.value.isOnlyCommunityHubMounted
  ) {
    return false;
  }
  // Then check if the user has no team
  return (provider.spaceGroups ?? []).every(
    (group) => group.type === SpaceProviderNS.UserTypeEnum.USER,
  );
};

const onProviderClick = (spaceProvider: SpaceProviderNS.SpaceProvider) => {
  if (
    isConnectingToProvider.value === spaceProvider.id ||
    loadingProviderSpacesData.value[spaceProvider.id]
  ) {
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

const isSpaceProviderActive = (spaceProviderId: string) =>
  spaceProviderId === $route.params.spaceProviderId;

const isSpaceGroupActive = (groupId: string) =>
  groupId === $route.params.groupId;

const { getSpaceProviderIcon, getSpaceGroupIcon } = useSpaceIcons();

const isLoggedInHubProvider = (spaceProvider: SpaceProviderNS.SpaceProvider) =>
  isHubProvider(spaceProvider) && spaceProvider.connected;

type SpaceProviderNavItems = NavMenuItemProps & {
  id: string;
  to: RouteLocationRaw;
  onClick: () => void;
  metadata: { spaceProvider: SpaceProviderNS.SpaceProvider };
};

type SpaceGroupsNavItems = NavMenuItemProps & {
  id: string;
  to: RouteLocationRaw;
  metadata: { spaceGroup: SpaceProviderNS.SpaceGroup };
};

const getItemsForSpaceGroups = (
  spaceProvider: SpaceProviderNS.SpaceProvider,
): SpaceGroupsNavItems[] => {
  return isLoggedInHubProvider(spaceProvider)
    ? spaceProvider.spaceGroups.map(
        (group) =>
          ({
            to: {
              name: APP_ROUTES.Home.SpaceSelectionPage,
              params: { spaceProviderId: spaceProvider.id, groupId: group.id },
            },
            id: group.id,
            text: group.name,
            active: isSpaceGroupActive(group.id),
            metadata: { spaceGroup: group },
          }) satisfies SpaceGroupsNavItems,
      )
    : [];
};

const providerItems = computed<SpaceProviderNavItems[]>(() =>
  Object.values(spaceProviders.value ?? {}).map((spaceProvider) => {
    const item: SpaceProviderNavItems = {
      id: spaceProvider.id,
      to: {
        name: APP_ROUTES.Home.SpaceSelectionPage,
        params: {
          spaceProviderId: spaceProvider.id,
          groupId: "all",
        },
      },
      text: formatSpaceProviderName(spaceProvider),
      active: isSpaceProviderActive(spaceProvider.id),
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
    :data-test-id="item.id"
    v-bind="item"
    manual-navigation
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
        v-if="shouldShowLoading(item.metadata.spaceProvider)"
        class="loading-indicator"
      />

      <FunctionButton
        v-if="shouldShowLogout(item.metadata.spaceProvider)"
        compact
        @click.stop.prevent="logout(item.metadata.spaceProvider)"
      >
        <LeaveIcon />
      </FunctionButton>
    </template>

    <template
      v-if="isLoggedInHubProvider(item.metadata.spaceProvider!)"
      #children
    >
      <NavMenu :link-component="RouterLink">
        <NavMenuItem
          v-for="child in getItemsForSpaceGroups(item.metadata.spaceProvider!)"
          :key="child.id"
          :data-test-id="child.id"
          v-bind="child"
        >
          <template #prepend>
            <Component :is="getSpaceGroupIcon(child.metadata!.spaceGroup!)" />
          </template>
        </NavMenuItem>

        <NavMenuItem
          v-if="shouldShowCreateTeamOption(item.metadata.spaceProvider!)"
          text="Get KNIME Pro"
          target="_blank"
          :href="`${KNIME_PRO_URL}&alt=spaceExplorer`"
        >
          <template #prepend>
            <LinkExternalIcon />
          </template>
        </NavMenuItem>
      </NavMenu>
    </template>
  </NavMenuItem>
</template>

<style lang="postcss" scoped>
.login-indicator {
  color: var(--knime-dove-gray);
  font-weight: 400;
  font-size: 13px;
}

.loading-indicator {
  margin-right: 8px;
}
</style>
