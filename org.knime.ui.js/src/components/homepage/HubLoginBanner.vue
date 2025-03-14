<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { Button, FunctionButton } from "@knime/components";
import CloseIcon from "@knime/styles/img/icons/close.svg";
import LinkExternalIcon from "@knime/styles/img/icons/link-external.svg";

import { knimeExternalUrls } from "@/plugins/knimeExternalUrls";
import { useApplicationStore } from "@/store/application/application";
import { useSpaceProvidersStore } from "@/store/spaces/providers";

const applicationStore = useApplicationStore();
const { dismissedHubLoginBanner } = storeToRefs(applicationStore);
const { getCommunityHubInfo } = storeToRefs(useSpaceProvidersStore());

const bannerTitle = computed(() =>
  getCommunityHubInfo.value.isCommunityHubConnected
    ? "Automate Workflows with KNIME Team Plan"
    : "Store your workflows in your free private cloud space",
);

const buttonText = computed(() =>
  getCommunityHubInfo.value.isCommunityHubConnected
    ? "Try for free"
    : "Sign up to KNIME Hub",
);

const buttonLink = computed(() =>
  getCommunityHubInfo.value.isCommunityHubConnected
    ? knimeExternalUrls.TEAM_PLAN_URL
    : knimeExternalUrls.COMMUNITY_HUB_URL,
);

const dismissBanner = () => {
  applicationStore.dismissedHubLoginBanner = true;
};

const shouldShowBanner = computed(() => {
  if (
    dismissedHubLoginBanner.value ||
    !getCommunityHubInfo.value.isOnlyCommunityHubMounted
  ) {
    return false;
  }

  return (
    // show banner if its mounted but not connected
    (getCommunityHubInfo.value.isOnlyCommunityHubMounted &&
      !getCommunityHubInfo.value.isCommunityHubConnected) ||
    // show banner if its connected and space groups are only users
    (getCommunityHubInfo.value.isCommunityHubConnected &&
      getCommunityHubInfo.value.areAllGroupsUsers)
  );
});
</script>

<template>
  <div v-if="shouldShowBanner" class="hub-login-banner">
    <FunctionButton class="close" compact @click="dismissBanner">
      <CloseIcon />
    </FunctionButton>

    <div class="content">
      <h4 class="title">{{ bannerTitle }}</h4>
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
