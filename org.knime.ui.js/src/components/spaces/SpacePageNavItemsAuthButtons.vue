<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";

import LoadingIcon from "webapps-common/ui/components/LoadingIcon.vue";
import Button from "webapps-common/ui/components/Button.vue";

import { type NavMenuItemType } from "@/components/common/side-nav";
import { SpaceProviderNS } from "@/api/custom-types";

import { useStore } from "@/composables/useStore";

type Props = {
  item: NavMenuItemType;
};

defineProps<Props>();

const store = useStore();
const $router = useRouter();

const isConnectingToProvider = computed(
  () => store.state.spaces.isConnectingToProvider,
);
const isLoadingProviders = computed(
  () => store.state.spaces.isLoadingProviders,
);
const disabled = computed(
  () => isLoadingProviders.value || Boolean(isConnectingToProvider.value),
);

const onLogin = async (spaceProvider: SpaceProviderNS.SpaceProvider) => {
  const spaceProviderId = spaceProvider.id;

  await store.dispatch("spaces/connectProvider", { spaceProviderId });
};

const onLogout = async (spaceProviderId: string) => {
  await store.dispatch("spaces/disconnectProvider", {
    spaceProviderId,
    $router,
  });
};

const shouldDisplayLoginButton = (
  spaceProvider: SpaceProviderNS.SpaceProvider,
) => {
  return (
    spaceProvider.connectionMode !== "AUTOMATIC" && !spaceProvider.connected
  );
};

const shouldDisplayLogoutButton = (
  spaceProvider: SpaceProviderNS.SpaceProvider,
) => {
  return (
    spaceProvider.connectionMode === "AUTHENTICATED" && spaceProvider.connected
  );
};
</script>

<template>
  <Button
    v-if="
      item.metadata?.spaceProvider &&
      shouldDisplayLoginButton(item.metadata.spaceProvider)
    "
    with-border
    compact
    :disabled="disabled"
    class="login"
    @click.stop="onLogin(item.metadata.spaceProvider)"
  >
    <template v-if="isConnectingToProvider === item.metadata.spaceProvider.id">
      <LoadingIcon />
    </template>
    <template v-else> Login </template>
  </Button>

  <Button
    v-if="
      item.metadata?.spaceProvider &&
      shouldDisplayLogoutButton(item.metadata.spaceProvider)
    "
    with-border
    compact
    :disabled="disabled"
    class="logout"
    @click.stop="onLogout(item.metadata.spaceProvider.id)"
  >
    Logout
  </Button>
</template>

<style lang="postcss" scoped>
& .login,
& .logout {
  min-width: 70px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

& .login:deep(svg) {
  margin-right: 0;
}
</style>
