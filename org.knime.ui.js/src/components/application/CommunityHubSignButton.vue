<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";

import { FunctionButton, type MenuItem } from "@knime/components";
import CubeIcon from "@knime/styles/img/icons/cube.svg";
import LeaveIcon from "@knime/styles/img/icons/leave.svg";
import UserIcon from "@knime/styles/img/icons/user.svg";

import OptionalSubMenuActionButton from "@/components/common/OptionalSubMenuActionButton.vue";
import { knimeExternalUrls } from "@/plugins/knimeExternalUrls";
import { APP_ROUTES } from "@/router/appRoutes";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { useSpaceProviderAuth } from "../spaces/useSpaceProviderAuth";

const { KNIME_HUB_HOME_URL } = knimeExternalUrls;
const $router = useRouter();

const { connectAndNavigate, logout } = useSpaceProviderAuth();
const { getCommunityHubInfo } = storeToRefs(useSpaceProvidersStore());

const userName = computed(
  () =>
    getCommunityHubInfo.value?.communityHubProvider?.spaceGroups?.[0]?.name ??
    "User",
);

const openUserHubProfile = () =>
  window.open(`${KNIME_HUB_HOME_URL}${userName.value}`, "_blank");

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

const onItemClick = (_: MouseEvent, item: MenuItem) =>
  item.metadata?.handler?.();
</script>

<template>
  <FunctionButton
    v-if="
      getCommunityHubInfo.isOnlyCommunityHubMounted &&
      !getCommunityHubInfo.isCommunityHubConnected
    "
    class="header-button"
    title="Sign in"
    @click="connectAndNavigate(getCommunityHubInfo.communityHubProvider!)"
  >
    <UserIcon />
    Sign in
  </FunctionButton>

  <div>
    <OptionalSubMenuActionButton
      v-if="
        getCommunityHubInfo.isOnlyCommunityHubMounted &&
        getCommunityHubInfo.isCommunityHubConnected
      "
      class="sign-menu"
      hide-dropdown
      :item="signMenuItem"
      @item-click="onItemClick"
    />
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

& .header-button {
  border: 1px solid var(--knime-dove-gray);
  display: flex;
  margin-left: 0;
  margin-right: var(--space-4);
  align-items: center;
  justify-content: center;
  color: var(--knime-white);
  height: var(--header-button-height);
  padding: 10px;

  & svg {
    @mixin svg-icon-size 16;

    margin-right: var(--space-4);
    stroke: var(--knime-white);
  }
}
</style>
