import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

import { SpaceProviderNS } from "@/api/custom-types";
import { useStore } from "@/composables/useStore";
import { APP_ROUTES } from "@/router/appRoutes";
import { isHubProvider } from "@/store/spaces/util";
import { getToastPresets } from "@/toastPresets";

export const useSpaceProviderAuth = () => {
  const store = useStore();
  const $router = useRouter();
  const $route = useRoute();
  const { toastPresets } = getToastPresets();

  const loadingProviderSpacesData = computed(
    () => store.state.spaces.loadingProviderSpacesData,
  );

  const isConnectingToProvider = computed(
    () => store.state.spaces.isConnectingToProvider,
  );

  const canLogin = (spaceProvider: SpaceProviderNS.SpaceProvider) =>
    spaceProvider.connectionMode !== "AUTOMATIC" && !spaceProvider.connected;

  const isProviderLoadingData = (
    spaceProvider: SpaceProviderNS.SpaceProvider,
  ) => loadingProviderSpacesData.value[spaceProvider.id];

  const shouldShowLogout = (spaceProvider: SpaceProviderNS.SpaceProvider) =>
    spaceProvider.connectionMode === "AUTHENTICATED" &&
    spaceProvider.connected &&
    store.state.spaces.hasLoadedProviders &&
    !isProviderLoadingData(spaceProvider);

  const shouldShowLoginIndicator = (
    spaceProvider: SpaceProviderNS.SpaceProvider,
  ) => {
    return (
      !shouldShowLogout(spaceProvider) &&
      canLogin(spaceProvider) &&
      isConnectingToProvider.value !== spaceProvider.id
    );
  };

  const shouldShowLoading = (spaceProvider: SpaceProviderNS.SpaceProvider) =>
    isConnectingToProvider.value === spaceProvider.id ||
    isProviderLoadingData(spaceProvider);

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

      if (!isConnected) {
        return;
      }

      // if route updated while login was in progress then skip redirect
      if (currentRoute !== $route.fullPath) {
        return;
      }

      const updatedProvider =
        store.state.spaces.spaceProviders![spaceProviderId];

      // If it’s Hub, go to the space selection overview.
      if (isHubProvider(updatedProvider)) {
        $router.push({
          name: APP_ROUTES.Home.SpaceSelectionPage,
          params: {
            spaceProviderId: updatedProvider.id,
            groupId: "all",
          },
        });
      } else {
        // Server -> single group & space, so jump straight to browsing
        const spaceGroup = updatedProvider.spaceGroups.at(0)!;
        const spaceId = spaceGroup.spaces.at(0)!.id;

        $router.push({
          name: APP_ROUTES.Home.SpaceBrowsingPage,
          params: {
            spaceProviderId: updatedProvider.id,
            groupId: spaceGroup.id,
            spaceId,
            itemId: "root",
          },
        });
      }
    } catch (error) {
      consola.error("Failed to connect or load provider data", {
        error,
        spaceProviderId,
      });

      toastPresets.spaces.auth.connectFailed({
        error,
        providerName: spaceProvider.name,
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
    shouldShowLoading,
    connectAndNavigate,
    logout,
    shouldShowLoginIndicator,
    shouldShowLogout,
  };
};
