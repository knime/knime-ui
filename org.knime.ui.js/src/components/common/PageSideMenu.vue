<script setup lang="ts">
import { computed, ref } from "vue";
import { useStore } from "@/composables/useStore";
import { useRouter, useRoute } from "vue-router";
import { APP_ROUTES } from "@/router/appRoutes";
import { SpaceProviderNS } from "@/api/custom-types";
import Button from "webapps-common/ui/components/Button.vue";
import SkeletonItem from "@/components/common/skeleton-loader/SkeletonItem.vue";

interface Props {
  items?: SpaceItem[];
}

const store = useStore();
const $router = useRouter();
const $route = useRoute();

const spaceProviders = computed(() => store.state.spaces.spaceProviders);
const activeSpaceProvider = computed(
  () => store.state.spaces.activeSpaceProvider,
);
const isLoadingProvider = computed(() => store.state.spaces.isLoadingProvider);

withDefaults(defineProps<Props>(), {
  items: () => [],
});

let isConnectingToProvider = ref(null);

const onRecentClick = () => {
  store.commit("spaces/setActiveSpaceProvider", null);
  $router.push({ name: APP_ROUTES.EntryPage.HomePage });
};

const onSpaceClick = (spaceProvider) => {
  store.commit("spaces/setActiveSpaceProvider", spaceProvider);
  $router.push({ name: APP_ROUTES.EntryPage.SpaceProviderPage });
};

const isLocalProvider = (spaceProvider) => {
  return spaceProvider.type === SpaceProviderNS.TypeEnum.LOCAL;
};

const isHomePageActive = computed(() => {
  return $route.name === APP_ROUTES.EntryPage.HomePage;
});

const onLogin = async (spaceProvider) => {
  const spaceProviderId = spaceProvider.id;

  isConnectingToProvider.value = spaceProviderId;
  await store.dispatch("spaces/connectProvider", { spaceProviderId });
  isConnectingToProvider.value = null;
  store.commit("spaces/setActiveSpaceProvider", spaceProvider);
  if (isHomePageActive.value) {
    $router.push({ name: APP_ROUTES.EntryPage.SpaceProviderPage });
  }
};

const onLogout = async (spaceProviderId) => {
  await store.dispatch("spaces/disconnectProvider", {
    spaceProviderId,
  });
};

const shouldDisplayLoginButton = (spaceProvider) => {
  return (
    spaceProvider.connectionMode !== "AUTOMATIC" && !spaceProvider.connected
  );
};

const shouldDisplayLogoutButton = (spaceProvider) => {
  return (
    spaceProvider.connectionMode === "AUTHENTICATED" && spaceProvider.connected
  );
};

const isItemActive = (spaceProviderId) =>
  spaceProviderId === activeSpaceProvider.value?.id;
</script>

<template>
  <ul v-if="spaceProviders">
    <li :class="{ active: isHomePageActive }" @click="onRecentClick">
      <span>Recent</span>
    </li>
    <li
      v-for="spaceProvider of spaceProviders"
      :key="spaceProvider.id"
      :class="[
        'space-provider',
        {
          active: isItemActive(spaceProvider.id),
          disabled: !spaceProvider.connected,
        },
      ]"
      @click="onSpaceClick(spaceProvider)"
    >
      <span>
        {{ isLocalProvider(spaceProvider) ? "Local space" : spaceProvider.id }}
      </span>
      <div class="connection-buttons">
        <Button
          v-if="shouldDisplayLoginButton(spaceProvider)"
          with-border
          compact
          :disabled="isLoadingProvider"
          class="login"
          @click.stop="onLogin(spaceProvider)"
          >Login</Button
        >

        <Button
          v-if="shouldDisplayLogoutButton(spaceProvider)"
          with-border
          compact
          :disabled="isLoadingProvider"
          class="logout"
          @click.stop="onLogout(spaceProvider.id)"
          >Logout</Button
        >
      </div>
    </li>
  </ul>
  <div
    v-if="isLoadingProvider && !isConnectingToProvider"
    class="side-menu-skeleton"
  >
    <div v-for="index in 4" :key="index" class="menu-skeleton-item">
      <SkeletonItem
        :color1="$colors.SilverSandSemi"
        width="100%"
        height="2px"
      />
      <div class="skeleton-list-provider">
        <SkeletonItem
          :color1="$colors.SilverSandSemi"
          width="50%"
          height="30px"
        />
        <SkeletonItem
          :color1="$colors.SilverSandSemi"
          width="70px"
          height="30px"
          type="button"
        />
      </div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
ul {
  margin: 0;
  list-style-type: none;
  padding: 0;
  width: 300px;
}

.space-provider {
  display: flex;
  justify-content: space-between;
  flex-flow: row nowrap;
  align-items: flex-start;

  & .login,
  .logout {
    cursor: pointer;
    pointer-events: all;
    width: 70px;
  }
}

span {
  color: var(--knime-dove-gray);
  text-decoration: none;
  font-weight: 500;
}

.active {
  border-top: 3px solid var(--knime-masala);

  & span {
    font-weight: 700;
  }

  &:hover {
    cursor: default;
  }
}

.disabled {
  cursor: default;
  pointer-events: none;
}

.connection-buttons {
  padding: 1px 0;
}

li:not(.disabled, .active):hover {
  & span {
    cursor: pointer;
    color: var(--knime-masala);
  }
}

.side-menu-skeleton {
  padding: 0;
  width: 300px;

  & .menu-skeleton-item {
    display: flex;
    flex-direction: column;

    & .skeleton-list-provider {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      padding: 5px 0 20px;
    }
  }
}

/* vertical mode */
@media only screen and (min-width: 901px) {
  li {
    border-top: 1px solid var(--knime-silver-sand);
    padding-top: 2px;

    &.active {
      padding-top: 0;
    }

    & > * {
      padding: 7px 0 20px;
      display: block;

      & svg {
        float: right;
      }
    }
  }
}

/* horizontal mode fixed on screen bottom */
@media only screen and (max-width: 900px) {
  li {
    padding-top: 13px;
    border-top: 1px solid var(--knime-silver-sand);

    & > * {
      font-size: 12px;
      line-height: 18px;

      & svg {
        display: block;
        margin: 0 auto;
      }
    }

    &:not(.active) {
      border-top: 3px solid transparent;
    }
  }
}
</style>
