import { API } from "@api";
import { defineStore } from "pinia";

import { SpaceProviderNS } from "@/api/custom-types";
import type { SpaceProvider } from "@/api/gateway-api/generated-api";
import { useApplicationStore } from "@/store/application/application";
import { findSpaceById } from "@/store/spaces/util";
import { createUnwrappedPromise } from "@/util/createUnwrappedPromise";

import { useSpaceCachingStore } from "./caching";

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

    setAllSpaceProviders(spaceProvidersMetaInfo: SpaceProvider[]) {
      const spaceProviders = Object.fromEntries(
        spaceProvidersMetaInfo.map((sp) => [sp.id, { ...sp, spaceGroups: [] }]),
      );
      const connectedProviderIds = Object.values(spaceProviders)
        .filter(
          ({ connected, connectionMode }) =>
            connected || connectionMode === "AUTOMATIC",
        )
        .map(({ id }) => id);

      // add the providers without data to make them visible
      this.setSpaceProviders(spaceProviders);
      this.setIsLoadingProviders(false);

      consola.trace(
        "action::setAllSpaceProviders -> Fetching provider spaces",
        {
          connectedProviderIds,
        },
      );

      const successfulProviderIds: string[] = [];
      const failedProviderIds: string[] = [];

      const { promise, resolve } = createUnwrappedPromise<{
        successfulProviderIds: string[];
        failedProviderIds: string[];
      }>();

      const dataLoadQueue: Promise<unknown>[] = [];

      for (const id of connectedProviderIds) {
        const loadDataPromise = this.fetchProviderSpaces({ id })
          .then((spacesData) => {
            successfulProviderIds.push(id);
            const { spaceGroups, ...providerMeta } = spaceProviders[id];
            this.updateSpaceProvider({
              id,
              value: {
                ...providerMeta,
                spaceGroups: spacesData,
              } satisfies SpaceProviderNS.SpaceProvider,
            });

            consola.info(
              "action::setAllSpaceProviders -> updated provider spaces",
              { spacesData, updatedProvider: spaceProviders[id] },
            );
          })
          .catch((error) => {
            failedProviderIds.push(id);

            consola.error(
              "action::setAllSpaceProviders -> Failed to load provider spaces",
              { spaceProviderId: id, error },
            );

            // set as disconnected so that user re-attempts the data fetch on login
            this.updateSpaceProvider({
              id,
              value: { ...spaceProviders[id], connected: false },
            });
          });

        dataLoadQueue.push(loadDataPromise);
      }

      Promise.allSettled(dataLoadQueue).then(() => {
        this.setHasLoadedProviders(true);
        resolve({ successfulProviderIds, failedProviderIds });
      });

      return promise;
    },

    async fetchProviderSpaces({ id }: { id: string }) {
      try {
        this.setLoadingProviderData({ id, loading: true });

        const data = await API.space.getSpaceGroups({ spaceProviderId: id });

        consola.info("action::fetchProviderSpaces", {
          params: { id },
          response: data,
        });

        return data;
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

        const { spaceGroups, ...spaceProviderMeta } = this.spaceProviders[id];
        const spacesData = await this.fetchProviderSpaces({ id });

        this.updateSpaceProvider({
          id,
          value: {
            ...spaceProviderMeta,
            spaceGroups: spacesData,
          } satisfies SpaceProviderNS.SpaceProvider,
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
  },
});
