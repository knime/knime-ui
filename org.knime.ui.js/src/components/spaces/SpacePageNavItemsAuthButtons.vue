<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";

import LoadingIcon from "webapps-common/ui/components/LoadingIcon.vue";
import Button from "webapps-common/ui/components/Button.vue";

import { SpaceProviderNS } from "@/api/custom-types";

import { useStore } from "@/composables/useStore";

type Props = {
  spaceProvider: SpaceProviderNS.SpaceProvider;
};

const props = defineProps<Props>();

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

const onLogin = async () => {
  const spaceProviderId = props.spaceProvider.id;

  await store.dispatch("spaces/connectProvider", { spaceProviderId });
};

const onLogout = async () => {
  await store.dispatch("spaces/disconnectProvider", {
    spaceProviderId: props.spaceProvider.id,
    $router,
  });
};

const shouldDisplayLoginButton = computed(
  () =>
    props.spaceProvider.connectionMode !== "AUTOMATIC" &&
    !props.spaceProvider.connected,
);

const shouldDisplayLogoutButton = computed(
  () =>
    props.spaceProvider.connectionMode === "AUTHENTICATED" &&
    props.spaceProvider.connected,
);
</script>

<template>
  <Button
    v-if="shouldDisplayLoginButton"
    with-border
    compact
    :disabled="disabled"
    class="login"
    @click.stop.prevent="onLogin()"
  >
    <template v-if="isConnectingToProvider === spaceProvider.id">
      <LoadingIcon />
    </template>
    <template v-else> Login </template>
  </Button>

  <Button
    v-if="shouldDisplayLogoutButton"
    with-border
    compact
    :disabled="disabled"
    class="logout"
    @click.stop.prevent="onLogout()"
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
