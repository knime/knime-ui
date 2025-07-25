<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";

import { FunctionButton, type MenuItem } from "@knime/components";
import CubeIcon from "@knime/styles/img/icons/cube.svg";
import LeaveIcon from "@knime/styles/img/icons/leave.svg";
import UserIcon from "@knime/styles/img/icons/user.svg";

import OptionalSubMenuActionButton from "@/components/common/OptionalSubMenuActionButton.vue";
import { knimeExternalUrls, modernUISource } from "@/plugins/knimeExternalUrls";
import { APP_ROUTES } from "@/router/appRoutes";
import { useSpaceAuthStore } from "@/store/spaces/auth";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import type { MenuItemWithHandler } from "../../common/types";
import { useSpaceProviderAuth } from "../../spaces/useSpaceProviderAuth";

const $router = useRouter();
const $route = useRoute();

const { connectAndNavigate, logout } = useSpaceProviderAuth();
const { getCommunityHubInfo } = storeToRefs(useSpaceProvidersStore());
const { connectProvider } = useSpaceAuthStore();

const userName = computed(
  () =>
    getCommunityHubInfo.value?.communityHubProvider?.spaceGroups?.[0]?.name ??
    "User",
);

const openUserHubProfile = () =>
  window.open(
    `${knimeExternalUrls.KNIME_HUB_HOME_URL}${userName.value}${modernUISource}`,
    "_blank",
  );

const redirectToCommunityHubSpaces = () =>
  $router.push({
    name: APP_ROUTES.Home.SpaceSelectionPage,
    params: {
      spaceProviderId: getCommunityHubInfo.value.communityHubProvider?.id,
      groupId: "all",
    },
  });

const signMenuItem = computed<MenuItem>(() => {
  return {
    text: userName.value,
    icon: UserIcon,
    children: [
      {
        text: "Hub Spaces",
        icon: CubeIcon,
        metadata: {
          handler: () => redirectToCommunityHubSpaces(),
        },
      },
      {
        text: "Profile",
        icon: UserIcon,
        metadata: {
          handler: () => openUserHubProfile(),
        },
      },
      {
        text: "Logout",
        icon: LeaveIcon,
        metadata: {
          handler: () =>
            logout(getCommunityHubInfo.value.communityHubProvider!),
        },
      },
    ],
  };
});

const onSignInButtonClick = () => {
  if ($route.name === APP_ROUTES.WorkflowPage) {
    connectProvider({
      spaceProviderId: getCommunityHubInfo.value.communityHubProvider!.id,
    });
    return;
  }

  connectAndNavigate(getCommunityHubInfo.value.communityHubProvider!);
};

const onItemClick = (_: MouseEvent, item: MenuItem) =>
  (item as MenuItemWithHandler).metadata?.handler?.();
</script>

<template>
  <OptionalSubMenuActionButton
    v-if="getCommunityHubInfo.isCommunityHubConnected"
    class="sign-menu"
    hide-dropdown
    :item="signMenuItem"
    @item-click="onItemClick"
  />

  <FunctionButton
    v-else
    class="header-button"
    title="Sign in"
    @click="onSignInButtonClick"
  >
    <UserIcon />
    Sign in
  </FunctionButton>
</template>
