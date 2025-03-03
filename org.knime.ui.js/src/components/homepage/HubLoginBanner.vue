<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { Button, FunctionButton } from "@knime/components";
import CloseIcon from "@knime/styles/img/icons/close.svg";
import LinkExternalIcon from "@knime/styles/img/icons/link-external.svg";

import { knimeExternalUrls } from "@/plugins/knimeExternalUrls";
import { useApplicationStore } from "@/store/application/application";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { isHubProvider, isLocalProvider } from "@/store/spaces/util";

const applicationStore = useApplicationStore();
const { dismissedHubLoginBanner } = storeToRefs(applicationStore);
const { spaceProviders } = storeToRefs(useSpaceProvidersStore());

const externalProviders = computed(() =>
  Object.values(spaceProviders.value ?? {}).filter(
    (provider) => !isLocalProvider(provider),
  ),
);

const hasOneProviderConnected = computed(
  () =>
    externalProviders.value.filter((provider) => provider.connected).length ===
    1,
);

const isCommunityHub = computed(() => {
  if (externalProviders.value.length !== 1) {
    return false;
  }
  const [provider] = externalProviders.value;
  return (
    isHubProvider(provider) &&
    provider.hostname?.includes(knimeExternalUrls.KNIME_HUB_HOME_HOSTNAME)
  );
});

const showBanner = computed(() => {
  if (dismissedHubLoginBanner.value) {
    return false;
  }
  return (
    (hasOneProviderConnected.value && isCommunityHub.value) ||
    isCommunityHub.value
  );
});

const bannerTitle = computed(() =>
  hasOneProviderConnected.value
    ? "Automate Workflows with KNIME Team Plan"
    : "Store your workflows in your free private cloud space",
);

const buttonText = computed(() =>
  hasOneProviderConnected.value ? "Try for free" : "Sign up to KNIME Hub",
);

const buttonLink = computed(() =>
  hasOneProviderConnected.value
    ? knimeExternalUrls.TEAM_PLAN_URL
    : knimeExternalUrls.COMMUNITY_HUB_URL,
);

const dismissBanner = () => {
  applicationStore.dismissedHubLoginBanner = true;
};
</script>

<template>
  <div v-if="showBanner" class="hub-login-banner">
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
