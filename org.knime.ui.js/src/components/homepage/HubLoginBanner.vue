<script setup lang="ts">
import { computed } from "vue";

import { Button, FunctionButton } from "@knime/components";
import CloseIcon from "@knime/styles/img/icons/close.svg";
import LinkExternalIcon from "@knime/styles/img/icons/link-external.svg";

import { SpaceProviderNS } from "@/api/custom-types";
import { useStore } from "@/composables/useStore";
import { isHubProvider, isLocalProvider } from "@/store/spaces/util";

const store = useStore();

const spaceProviders = computed(() => store.state.spaces.spaceProviders ?? {});

const communityHubProviders = computed(() =>
  Object.values(spaceProviders.value).filter(
    (provider) =>
      isHubProvider(provider) && provider.hostname?.includes("hub.knime.com"),
  ),
);

const isCommunityHubConnected = computed(() =>
  communityHubProviders.value.some((provider) => provider.connected),
);

const communityHubProvider = computed(() => communityHubProviders.value[0]);

const isCommunityHubMounted = computed(
  () => communityHubProviders.value.length > 0,
);

const areAllGroupsUsers = computed(() =>
  communityHubProvider.value
    ? (communityHubProvider.value.spaceGroups ?? []).every(
        (group) => group.type === SpaceProviderNS.UserTypeEnum.USER,
      )
    : false,
);

const isOnlyCommunityHubMounted = computed(() => {
  const nonLocalProviders = Object.values(spaceProviders.value).filter(
    (provider) => !isLocalProvider(provider),
  );
  return nonLocalProviders.length === 1 && isCommunityHubMounted.value;
});

const isBannerDismissed = computed(
  () => store.state.application.dismissedHubLoginBanner ?? false,
);

const shouldShowBanner = computed(() => {
  if (isBannerDismissed.value) {
    return false;
  }

  return (
    // show banner if its mounted but not connected
    (isOnlyCommunityHubMounted.value && !isCommunityHubConnected.value) ||
    // show banner if its connected and space groups are only users
    (isCommunityHubConnected.value && areAllGroupsUsers.value)
  );
});

const buttonText = computed(() =>
  isCommunityHubConnected.value ? "Try for free" : "Sign up to KNIME Hub",
);

const buttonLink = computed(() => {
  const baseUrl = isCommunityHubConnected.value
    ? "https://knime.com/team-plan?src=knimeappmodernui"
    : "https://www.knime.com/knime-community-hub?src=knimeappmodernui";

  return `${baseUrl}&alt=bannerButton`;
});

const dismissHubLoginBanner = () => {
  store.commit("application/setDismissedHubLoginBanner", true);
};
</script>

<template>
  <div v-if="shouldShowBanner" class="hub-login-banner">
    <FunctionButton class="close" compact @click="dismissHubLoginBanner">
      <CloseIcon />
    </FunctionButton>

    <div class="content">
      <h4 class="title">
        {{
          isCommunityHubConnected
            ? "Automate Workflows with KNIME Team Plan"
            : "Store your workflows in your free private cloud space"
        }}
      </h4>

      <Button
        class="button"
        with-border
        compact
        :href="buttonLink"
        target="_blank"
      >
        <LinkExternalIcon />
        {{ buttonText }}
      </Button>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.hub-login-banner {
  background: var(--knime-white);
  border-top: 1px solid var(--knime-silver-sand);
  display: flex;
  flex-direction: column;
  width: 420px;
  position: relative;

  & .close {
    display: block;
    position: absolute;
    right: var(--space-6);
    top: var(--space-6);
  }

  & .content {
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
    padding: var(--space-16);
    margin-bottom: 0;

    & h4 {
      margin: 0;
      font-size: 15px;
      line-height: 20px;
    }

    & .button {
      width: max-content;
    }
  }
}
</style>
