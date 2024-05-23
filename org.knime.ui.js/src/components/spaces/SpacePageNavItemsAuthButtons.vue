<script setup lang="ts">
import { computed, ref } from "vue";

import LoadingIcon from "webapps-common/ui/components/LoadingIcon.vue";
import Button from "webapps-common/ui/components/Button.vue";

import { type SidebarNavItemType } from "@/components/common/side-nav";
import { SpaceProviderNS } from "@/api/custom-types";

import { useStore } from "@/composables/useStore";

type Props = {
  item: SidebarNavItemType;
};

defineProps<Props>();

const emit = defineEmits<{
  connecting: [value: string | null];
}>();

const store = useStore();
const isLoadingProvider = computed(() => store.state.spaces.isLoadingProvider);

const connectingProviderId = ref<string | null>(null);

const onLogin = async (spaceProvider: SpaceProviderNS.SpaceProvider) => {
  const spaceProviderId = spaceProvider.id;

  connectingProviderId.value = spaceProviderId;
  emit("connecting", connectingProviderId.value);

  await store.dispatch("spaces/connectProvider", { spaceProviderId });

  connectingProviderId.value = null;
  emit("connecting", connectingProviderId.value);
};

const onLogout = async (spaceProviderId: string) => {
  await store.dispatch("spaces/disconnectProvider", {
    spaceProviderId,
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
    :disabled="isLoadingProvider"
    class="login"
    @click.stop="onLogin(item.metadata.spaceProvider)"
  >
    <template v-if="connectingProviderId === item.metadata.spaceProvider.id">
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
    :disabled="isLoadingProvider"
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
}

& .login:deep(svg) {
  margin-right: 0;
}
</style>
