import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

import { SpaceProviderNS } from "@/api/custom-types";
import {
  StoreActionException,
  displayStoreActionExceptionMessage,
} from "@/api/gateway-api/exceptions";
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

    const showErrorToast = (error?: Error) => {
      const showDefaultMessage = () =>
        $toast.show({
          type: "error",
          message: `Could not connect to ${spaceProvider.name}`,
        });

      if (!error) {
        showDefaultMessage();

        return;
      }

      if (error instanceof StoreActionException) {
        displayStoreActionExceptionMessage(error);
      } else {
        showDefaultMessage();
      }
    };

    try {
      const currentRoute = $route.fullPath;

      await store.dispatch("spaces/connectProvider", { spaceProviderId });

      // if route updated while login was in progress then skip redirect
      if (currentRoute !== $route.fullPath) {
        return;
      }

      const updatedProvider =
        store.state.spaces.spaceProviders![spaceProvider.id];

      const routeParamsMap = {
        [SpaceProviderNS.TypeEnum.HUB]: {
          spaceProviderId: spaceProvider.id,
          groupId: "all",
        },
        [SpaceProviderNS.TypeEnum.SERVER]: {
          spaceProviderId: spaceProvider.id,
          groupId: updatedProvider.spaceGroups.at(0)!.id,
        },
      } as const;

      const routeParams = routeParamsMap[spaceProvider.type];

      $router.push({
        name: APP_ROUTES.Home.SpaceSelectionPage,
        params: routeParams,
      });
    } catch (error) {
      consola.error("Failed to connect or load provider data", {
        error,
        spaceProviderId,
      });

      showErrorToast(error as Error);
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
