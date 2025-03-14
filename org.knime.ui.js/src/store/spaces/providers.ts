import { API } from "@api";
import { defineStore } from "pinia";

import { SpaceProviderNS } from "@/api/custom-types";
import type { SpaceProvider } from "@/api/gateway-api/generated-api";
import { knimeExternalUrls } from "@/plugins/knimeExternalUrls";
import { useApplicationStore } from "@/store/application/application";
import { findSpaceById, isLocalProvider } from "@/store/spaces/util";
import { createUnwrappedPromise } from "@/util/createUnwrappedPromise";

import { useSpaceCachingStore } from "./caching";

const { KNIME_HUB_HOME_HOSTNAME } = knimeExternalUrls;

export interface ProvidersState {
  /**
   * Record of all the providers currently available
   */
  spaceProviders: Record<string, SpaceProviderNS.SpaceProvider> | null;
  /**
   * Loading state used when fetching all the providers' basic info (without their data)
   */
  isLoadingProviders: boolean;
  /**
   * Loading state used when authenticating to a provider
   */
  isConnectingToProvider: string | null;
  /**
   * Indicates whether the initial provider fetch has been successful
   */
  hasLoadedProviders: boolean;
  /**
   * Record of loading state which indicates which provider is currently loading
   * its spaces data
   */
  loadingProviderSpacesData: Record<string, boolean>;
}

export const useSpaceProvidersStore = defineStore("space.providers", {
  state: (): ProvidersState => ({
    // metadata of all available space providers and their spaces (including local)
    spaceProviders: null,
    isLoadingProviders: false,
    isConnectingToProvider: null,
    hasLoadedProviders: false,
    loadingProviderSpacesData: {},
  }),
  actions: {
    setIsLoadingProviders(isLoadingProviders: boolean) {
      this.isLoadingProviders = isLoadingProviders;
    },

    setLoadingProviderData({ id, loading }: { id: string; loading: boolean }) {
      this.loadingProviderSpacesData[id] = loading;
    },

    setIsConnectingToProvider(isConnectingToProvider: string | null) {
      this.isConnectingToProvider = isConnectingToProvider;
    },

    setHasLoadedProviders(hasLoadedProviders: boolean) {
      this.hasLoadedProviders = hasLoadedProviders;
    },

    updateSpaceProvider({
      id,
      value,
    }: {
      id: string;
      value: Partial<SpaceProviderNS.SpaceProvider>;
    }) {
      this.spaceProviders = {
        ...this.spaceProviders,
        [id]: { ...(this.spaceProviders ?? {})[id], ...value },
      };
    },

    setSpaceProviders(
      spaceProviders: Record<string, SpaceProviderNS.SpaceProvider> | null,
    ) {
      this.spaceProviders = spaceProviders;
    },

    setAllSpaceProviders(spaceProviders: SpaceProvider[]) {
      consola.trace("action::setAllSpaceProviders -> Setting provider spaces");
      this.setHasLoadedProviders(false);
      const spaceProvidersById = Object.fromEntries(
        spaceProviders.map((sp) => [sp.id, { ...sp, spaceGroups: [] }]),
      );

      // add the providers without data to make them visible
      this.setSpaceProviders(spaceProvidersById);
      this.setIsLoadingProviders(false);
    },

    fetchSpaceGroupsForProviders(
      spaceProviders: SpaceProvider[] | SpaceProviderNS.SpaceProvider[],
    ) {
      const spaceProvidersById = Object.fromEntries(
        spaceProviders.map((sp) => [sp.id, sp]),
      );
      const connectedProviderIds = spaceProviders
        .filter(
          ({ connected, connectionMode }) =>
            connected || connectionMode === "AUTOMATIC",
        )
        .map(({ id }) => id);

      consola.trace(
        "action::fetchSpaceGroupsForProviders -> Fetching provider space groups",
        { connectedProviderIds },
      );

      const failedProviderNames: string[] = [];

      const { promise, resolve } = createUnwrappedPromise<{
        failedProviderNames: string[];
      }>();

      const spaceGroupsQueue: Promise<void>[] = [];

      for (const id of connectedProviderIds) {
        const currentSpaceProvider = spaceProvidersById[id];
        const spaceGroupsPromise = this.fetchProviderSpaces({ id })
          .then((spaceGroups) => {
            this.updateSpaceProvider({
              id,
              value: {
                ...currentSpaceProvider,
                spaceGroups,
              },
            });

            consola.info(
              "action::fetchSpaceGroupsForProviders -> Fetched provider space groups",
              { spaceGroups, updatedProvider: currentSpaceProvider },
            );
          })
          .catch((error) => {
            failedProviderNames.push(currentSpaceProvider.name);

            consola.error(
              "action::fetchSpaceGroupsForProviders -> Failed to fetch provider space groups",
              { spaceProviderId: id, error },
            );

            // set as disconnected so that user re-attempts the data fetch on login
            this.updateSpaceProvider({
              id,
              value: { ...currentSpaceProvider, connected: false },
            });
          });

        spaceGroupsQueue.push(spaceGroupsPromise);
      }

      Promise.allSettled(spaceGroupsQueue).then(() => {
        this.setHasLoadedProviders(true);
        const { openProjects } = useApplicationStore();
        useSpaceCachingStore().syncPathWithOpenProjects({ openProjects });
        resolve({ failedProviderNames });
      });

      return promise;
    },

    async fetchProviderSpaces({ id }: { id: string }) {
      try {
        this.setLoadingProviderData({ id, loading: true });

        const spaceGroups = await API.space.getSpaceGroups({
          spaceProviderId: id,
        });

        consola.info("action::fetchProviderSpaces", {
          params: { id },
          response: spaceGroups,
        });

        return spaceGroups;
      } catch (error) {
        consola.error(
          "action::fetchProviderSpaces -> Error fetching provider spaces",
          { error },
        );

        throw error;
      } finally {
        this.setLoadingProviderData({ id, loading: false });
      }
    },

    async reloadProviderSpaces({ id }: { id: string }) {
      if (!this.spaceProviders) {
        return;
      }

      try {
        consola.trace(
          "action::reloadProviderSpaces -> reloading provider spaces",
          { spaceProviderId: id },
        );

        const { spaceGroups: _oldSpaceGroups, ...spaceProviderMeta } =
          this.spaceProviders[id];
        const newSpaceGroups = await this.fetchProviderSpaces({ id });

        this.updateSpaceProvider({
          id,
          value: {
            ...spaceProviderMeta,
            spaceGroups: newSpaceGroups,
          },
        });
      } catch (error) {
        consola.error(
          "action::reloadProviderSpaces -> Error reloading provider spaces",
          { error },
        );
        throw error;
      }
    },
  },
  getters: {
    getProviderInfoFromProjectPath:
      (state) =>
      (projectId: string): SpaceProviderNS.SpaceProvider | null => {
        // spaces data has not been cached or providers are not yet loaded
        if (
          !useSpaceCachingStore().projectPath.hasOwnProperty(projectId) ||
          !state.spaceProviders
        ) {
          return null;
        }

        const { spaceProviderId } =
          useSpaceCachingStore().projectPath[projectId];

        return state.spaceProviders[spaceProviderId] || null;
      },

    activeProjectProvider: (state) => {
      const isUnknownProject: (projectId: string) => boolean =
        useApplicationStore().isUnknownProject;

      if (isUnknownProject(useApplicationStore().activeProjectId ?? "")) {
        return null;
      }

      const activeProjectOrigin = useApplicationStore().activeProjectOrigin;

      if (!activeProjectOrigin) {
        return null;
      }

      const providers = state.spaceProviders ?? {};
      const activeProjectProvider = providers[activeProjectOrigin.providerId];

      return activeProjectProvider ?? null;
    },

    getSpaceInfo(state) {
      return (projectId: string): SpaceProviderNS.Space | null => {
        // spaces data has not been cached or providers are not yet loaded
        if (
          !useSpaceCachingStore().projectPath.hasOwnProperty(projectId) ||
          !state.spaceProviders
        ) {
          return null;
        }

        const { spaceId } = useSpaceCachingStore().projectPath[projectId];
        const spaceProvider = this.getProviderInfoFromProjectPath(
          projectId,
        ) as SpaceProviderNS.SpaceProvider;

        const space = findSpaceById(
          { [spaceProvider.id]: spaceProvider },
          spaceId,
        );

        return space ?? null;
      };
    },

    getCommunityHubInfo(state) {
      const communityHubProvider = Object.values(
        state.spaceProviders ?? {},
      ).find(
        (provider) => provider.hostname?.includes(KNIME_HUB_HOME_HOSTNAME),
      );
      const isCommunityHubMounted = Boolean(communityHubProvider);
      const isCommunityHubConnected = communityHubProvider?.connected ?? false;
      const areAllGroupsUsers = (communityHubProvider?.spaceGroups ?? []).every(
        (group) => group.type === SpaceProviderNS.UserTypeEnum.USER,
      );

      return {
        isOnlyCommunityHubMounted:
          isCommunityHubMounted &&
          // filter out Hub and Server providers
          Boolean(
            Object.values(state.spaceProviders ?? {}).filter(
              (provider) => !isLocalProvider(provider),
            ).length === 1,
          ),
        isCommunityHubConnected,
        communityHubProvider,
        areAllGroupsUsers,
      };
    },
  },
});
