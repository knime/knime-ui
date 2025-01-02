import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";

import { SpaceProviderNS } from "@/api/custom-types";
import { APP_ROUTES } from "@/router/appRoutes";
import { useSpaceAuthStore } from "@/store/spaces/auth";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { isHubProvider } from "@/store/spaces/util";
import { getToastPresets } from "@/toastPresets";

export const useSpaceProviderAuth = () => {
  const {
    loadingProviderSpacesData,
    isConnectingToProvider,
    hasLoadedProviders,
    spaceProviders,
  } = storeToRefs(useSpaceProvidersStore());
  const { connectProvider, disconnectProvider } = useSpaceAuthStore();
  const $router = useRouter();
  const $route = useRoute();
  const { toastPresets } = getToastPresets();

  const canLogin = (spaceProvider: SpaceProviderNS.SpaceProvider) =>
    spaceProvider.connectionMode !== "AUTOMATIC" && !spaceProvider.connected;

  const isProviderLoadingData = (
    spaceProvider: SpaceProviderNS.SpaceProvider,
  ) => loadingProviderSpacesData.value[spaceProvider.id];

  const shouldShowLogout = (spaceProvider: SpaceProviderNS.SpaceProvider) =>
    spaceProvider.connectionMode === "AUTHENTICATED" &&
    spaceProvider.connected &&
    hasLoadedProviders.value &&
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

      const { isConnected } = await connectProvider({
        spaceProviderId,
      });

      if (!isConnected) {
        return;
      }

      // if route updated while login was in progress then skip redirect
      if (currentRoute !== $route.fullPath) {
        return;
      }

      const updatedProvider = spaceProviders.value![spaceProvider.id];

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
    await disconnectProvider({
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
