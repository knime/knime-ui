<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";

import { Button, FunctionButton } from "@knime/components";
import CloseIcon from "@knime/styles/img/icons/close.svg";
import LinkExternalIcon from "@knime/styles/img/icons/link-external.svg";

import { useApplicationStore } from "@/store/application/application";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { isHubProvider } from "@/store/spaces/util";

const applicationStore = useApplicationStore();
const { dismissedHubLoginBanner } = storeToRefs(applicationStore);

const { spaceProviders } = storeToRefs(useSpaceProvidersStore());

const isUserLoggedIn = computed(() => {
  const providers = Object.values(spaceProviders.value ?? {});
  return providers.some(
    (provider) => isHubProvider(provider) && provider.connected,
  );
});

const dismissHubLoginBanner = () => {
  applicationStore.dismissedHubLoginBanner = true;
};
</script>

<template>
  <div v-if="!dismissedHubLoginBanner" class="hub-login-banner">
    <FunctionButton class="close" compact @click="dismissHubLoginBanner">
      <CloseIcon />
    </FunctionButton>

    <div class="content">
      <h4 class="title">
        {{
          isUserLoggedIn
            ? "Automate Workflows with KNIME Team Plan"
            : "Store your workflows in your free private cloud space"
        }}
      </h4>

      <Button
        class="button"
        with-border
        compact
        :href="
          isUserLoggedIn
            ? 'https://hub.knime.com/site/pricing'
            : 'https://hub.knime.com'
        "
        target="_blank"
      >
        <LinkExternalIcon />
        {{ isUserLoggedIn ? "Try for free" : "Sign up to KNIME Hub" }}
      </Button>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.hub-login-banner {
  background: var(--knime-white);
  position: absolute;
  left: -16px;
  bottom: -16px;
  margin: 0 0 var(--space-16) var(--space-16);
  border-radius: 4px;
  border-top: 1px solid var(--knime-silver-sand);
  display: flex;
  flex-direction: column;
  z-index: 2;
  width: 420px;

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

    & h4 {
      margin: 0;
      font-size: 15px;
      font-weight: 500;
      line-height: 20px;
    }

    & .button {
      width: max-content;
      font-size: 15px;
      font-style: normal;
      font-weight: 600;
      line-height: 16px;
    }
  }
}
</style>
