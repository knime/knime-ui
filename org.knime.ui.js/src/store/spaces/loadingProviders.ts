/* eslint-disable max-lines */
import { API } from "@api";
import type { SpaceProvider } from "@/api/custom-types";

import type { ActionTree, GetterTree, MutationTree } from "vuex";
import type { RootStoreState } from "../types";
import type { SpacesState } from "./index";
import { localRootProjectPath } from "./caching";

export interface State {
  spaceProviders?: Record<string, SpaceProvider>;
  isLoadingProvider: boolean;
  hasLoadedProviders: boolean;
}

declare module "./index" {
  interface SpacesState extends State {}
}

export const state = (): State => ({
  // metadata of all available space providers and their spaces (including local)
  spaceProviders: null,

  isLoadingProvider: false,
  hasLoadedProviders: false,
});

export const mutations: MutationTree<SpacesState> = {
  setIsLoadingProvider(state, value: boolean) {
    state.isLoadingProvider = value;
  },

  setHasLoadedProviders(state, value: boolean) {
    state.hasLoadedProviders = value;
  },

  setSpaceProviders(state, value: Record<string, SpaceProvider>) {
    state.spaceProviders = value;
  },
};

export const actions: ActionTree<SpacesState, RootStoreState> = {
  async loadLocalSpace({ dispatch, commit }) {
    const spacesData = await dispatch("fetchProviderSpaces", {
      id: localRootProjectPath.spaceProviderId,
    });

    const localSpace = {
      id: "local",
      name: "Local space",
      connected: true,
      connectionMode: "AUTOMATIC",
      local: true,
      ...spacesData,
    };

    commit("setSpaceProviders", {
      [localRootProjectPath.spaceProviderId]: localSpace,
    });
  },

  refreshSpaceProviders(
    { state, commit, dispatch },
    { keepLocalSpace = true } = {}
  ) {
    if (state.isLoadingProvider) {
      return;
    }

    const localSpace =
      state.spaceProviders[localRootProjectPath.spaceProviderId];

    const spaceProviders = keepLocalSpace
      ? { [localRootProjectPath.spaceProviderId]: localSpace }
      : null;

    commit("setSpaceProviders", spaceProviders);

    dispatch("fetchAllSpaceProviders");
  },

  fetchAllSpaceProviders({ commit, state }) {
    if (state.isLoadingProvider) {
      return;
    }

    commit("setIsLoadingProvider", true);

    // provider fetch happens async, so the payload will be received via a
    // `SpaceProvidersResponseEvent` which will then call the `setAllSpaceProviders`
    // action
    API.desktop.getSpaceProviders();
  },

  async setAllSpaceProviders(
    { commit, state, dispatch },
    spaceProviders: Record<string, SpaceProvider>
  ) {
    try {
      const connectedProviderIds = Object.values(spaceProviders)
        .filter(
          ({ connected, connectionMode }) =>
            // skip loading local space
            // id !== localRootProjectPath.spaceProviderId &&
            connected || connectionMode === "AUTOMATIC"
        )
        .map(({ id }) => id);

      for (const id of connectedProviderIds) {
        const spacesData = await dispatch("fetchProviderSpaces", { id });
        // use current state of store to ensure the user is kept,
        // it's not part of the response and set by connectProvider
        spaceProviders[id] = {
          ...state.spaceProviders?.[id],
          ...spaceProviders[id],
          ...spacesData,
        };
      }
      commit("setSpaceProviders", spaceProviders);
      commit("setHasLoadedProviders", true);
    } catch (error) {
      commit("setHasLoadedProviders", false);
      consola.error("Error fetching providers", { error });
      throw error;
    } finally {
      commit("setIsLoadingProvider", false);
    }
  },

  async fetchProviderSpaces(_, { id }) {
    try {
      const providerData = await API.space.getSpaceProvider({
        spaceProviderId: id,
      });

      return { ...providerData, connected: true };
    } catch (error) {
      consola.error("Error fetching provider spaces", { error });
      throw error;
    }
  },
};

export const getters: GetterTree<SpacesState, RootStoreState> = {
  getSpaceInfo: (state) => (projectId: string) => {
    // spaces data has not been cached or providers are not yet loaded
    if (!state.projectPath.hasOwnProperty(projectId) || !state.spaceProviders) {
      return {};
    }

    const { spaceId: activeId, spaceProviderId: activeSpaceProviderId } =
      state.projectPath[projectId];

    if (activeId === "local") {
      return {
        local: true,
        private: false,
        name: "Local space",
      };
    }

    const activeSpaceProvider = state.spaceProviders[activeSpaceProviderId];
    if (!activeSpaceProvider?.spaces) {
      return {};
    }

    const space = activeSpaceProvider.spaces.find(({ id }) => id === activeId);

    if (space) {
      return {
        local: false,
        private: space.private,
        name: space.name,
      };
    }

    return {};
  },
};
