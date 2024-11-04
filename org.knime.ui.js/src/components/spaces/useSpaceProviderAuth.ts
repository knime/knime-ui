import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

import { SpaceProviderNS } from "@/api/custom-types";
import { useStore } from "@/composables/useStore";
import { getToastsProvider } from "@/plugins/toasts";
import { APP_ROUTES } from "@/router/appRoutes";

export const useSpaceProviderAuth = () => {
  const store = useStore();
  const $router = useRouter();
  const $route = useRoute();
  const $toast = getToastsProvider();

  const isLoadingProviders = computed(
    () => store.state.spaces.isLoadingProviders,
  );

  const isConnectingToProvider = computed(
    () => store.state.spaces.isConnectingToProvider,
  );

  const canLogin = (spaceProvider: SpaceProviderNS.SpaceProvider) =>
    spaceProvider.connectionMode !== "AUTOMATIC" && !spaceProvider.connected;

  const shouldShowLogout = (spaceProvider: SpaceProviderNS.SpaceProvider) =>
    spaceProvider.connectionMode === "AUTHENTICATED" && spaceProvider.connected;

  const shouldShowLoginIndicator = (
    spaceProvider: SpaceProviderNS.SpaceProvider,
  ) => {
    return (
      !shouldShowLogout(spaceProvider) &&
      canLogin(spaceProvider) &&
      isConnectingToProvider.value !== spaceProvider.id
    );
  };

  const isAuthDisabled = computed(
    () => isLoadingProviders.value || Boolean(isConnectingToProvider.value),
  );

  const connectAndNavigate = async (
    spaceProvider: SpaceProviderNS.SpaceProvider,
  ) => {
    const spaceProviderId = spaceProvider.id;

    // this can't happen, but we check so that TS knows about it
    // for the exhaustive type check in the routeParamsMap
    if (spaceProvider.type === SpaceProviderNS.TypeEnum.LOCAL) {
      return;
    }

    try {
      const currentRoute = $route.fullPath;

      const { isConnected } = await store.dispatch("spaces/connectProvider", {
        spaceProviderId,
      });

      // login could have been cancelled
      if (!isConnected) {
        return;
      }

      // if route updated while login was in progress then skip redirect
      if (currentRoute !== $route.fullPath) {
        return;
      }

      const { groups } = store.state.spaces.providerIndex[spaceProvider.id];

      const routeParamsMap = {
        [SpaceProviderNS.TypeEnum.HUB]: {
          spaceProviderId: spaceProvider.id,
          groupId: "all",
        },
        [SpaceProviderNS.TypeEnum.SERVER]: {
          spaceProviderId: spaceProvider.id,
          // grab the first group
          groupId: groups.values().next().value,
        },
      } as const;

      const routeParams = routeParamsMap[spaceProvider.type];

      $router.push({
        name: APP_ROUTES.Home.SpaceSelectionPage,
        params: routeParams,
      });
    } catch (error) {
      consola.error("Login failed", error);
      $toast.show({
        type: "error",
        message: `Could not connect to ${spaceProvider.name}`,
      });
    }
  };

  const logout = async (spaceProvider: SpaceProviderNS.SpaceProvider) => {
    await store.dispatch("spaces/disconnectProvider", {
      spaceProviderId: spaceProvider.id,
      $router,
    });
  };

  return {
    isConnectingToProvider,
    isAuthDisabled,
    connectAndNavigate,
    logout,
    shouldShowLoginIndicator,
    shouldShowLogout,
  };
};
