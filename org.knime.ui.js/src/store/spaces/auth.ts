import { API } from "@api";
import { defineStore } from "pinia";
import type { Router } from "vue-router";

import { SpaceProviderNS } from "@/api/custom-types";
import { APP_ROUTES } from "@/router/appRoutes";

import { useSpaceCachingStore } from "./caching";
import { useSpaceProvidersStore } from "./providers";

export const useSpaceAuthStore = defineStore("space.auth", {
  actions: {
    async connectProvider({
      spaceProviderId,
    }: {
      spaceProviderId: string;
    }): Promise<
      | { isConnected: true; providerData: SpaceProviderNS.SpaceProvider }
      | { isConnected: false; providerData: null }
    > {
      const providersStore = useSpaceProvidersStore();

      try {
        providersStore.setIsConnectingToProvider(spaceProviderId);
        // returns the provider metadata (but no spaces)
        const spaceProvider = await API.desktop.connectSpaceProvider({
          spaceProviderId,
        });

        if (!spaceProvider) {
          consola.error("action::connectProvider -> Invalid provider id", {
            spaceProviderId,
          });

          const providerName =
            providersStore.spaceProviders?.[spaceProviderId]?.name ?? "remote";

          throw new Error(`Failed to connect to ${providerName}`);
        }

        if (!spaceProvider.connected) {
          return { isConnected: false, providerData: null };
        }

        // fetch the spaces if we are now connected
        const spaceGroups = await providersStore.fetchProviderSpaces({
          id: spaceProviderId,
        });

        consola.info("action::connectProvider -> updating space provider", {
          spaceProvider,
          spaceGroups,
        });

        const updatedProvider = { ...spaceProvider, spaceGroups };

        providersStore.updateSpaceProvider({
          id: spaceProviderId,
          value: updatedProvider,
        });

        return { isConnected: true, providerData: updatedProvider };
      } catch (error) {
        consola.error(
          "action::connectProvider -> Error connecting to provider",
          {
            error,
          },
        );
        throw error;
      } finally {
        providersStore.setIsConnectingToProvider(null);
      }
    },

    async disconnectProvider({
      spaceProviderId,
      $router,
    }: {
      spaceProviderId: string;
      $router: Router;
    }) {
      const providersStore = useSpaceProvidersStore();

      try {
        await API.desktop.disconnectSpaceProvider({ spaceProviderId });

        const projectsWithDisconnectedProvider = Object.entries(
          useSpaceCachingStore().projectPath,
        ).flatMap(([projectId, path]) =>
          path.spaceProviderId === spaceProviderId ? [projectId] : [],
        );

        // update project paths that used this space provider
        projectsWithDisconnectedProvider.forEach((projectId) =>
          useSpaceCachingStore().setProjectPath({
            projectId,
            value: {
              spaceProviderId: "local",
              spaceId: "local",
              itemId: "root",
            },
          }),
        );

        // update space provider state
        if (!providersStore.spaceProviders) {
          return null;
        }

        const { spaceGroups, ...otherProperties } =
          providersStore.spaceProviders[spaceProviderId];

        providersStore.setSpaceProviders({
          ...providersStore.spaceProviders,
          [spaceProviderId]: {
            ...otherProperties,
            connected: false,
            spaceGroups: [],
          },
        });

        const { currentRoute } = $router;
        const regex = new RegExp(
          `${APP_ROUTES.Home.SpaceBrowsingPage}|${APP_ROUTES.Home.SpaceSelectionPage}`,
        );
        const isProviderRelatedPage = regex.test(
          currentRoute.value.name as string,
        );

        if (
          isProviderRelatedPage &&
          currentRoute.value.params?.spaceProviderId === spaceProviderId
        ) {
          $router.push({ name: APP_ROUTES.Home.GetStarted });
        }

        return spaceProviderId;
      } catch (error) {
        consola.error("Error disconnecting from provider", { error });
        throw error;
      }
    },
  },
  getters: {
    hasActiveHubSession(): boolean {
      const providersStore = useSpaceProvidersStore();

      if (!providersStore.spaceProviders) {
        return false;
      }

      return Boolean(
        Object.values(providersStore.spaceProviders).find(
          ({ connected, type }) =>
            type !== SpaceProviderNS.TypeEnum.LOCAL && connected,
        ),
      );
    },
  },
});
