import type { ActionTree, GetterTree, MutationTree } from "vuex";

import { API } from "@api";
import type { SpaceItemReference } from "@/api/gateway-api/generated-api";
import { SpaceProviderNS } from "@/api/custom-types";

import type { RootStoreState } from "../types";
import type { SpacesState } from "./index";
import { localRootProjectPath } from "./caching";
import { findSpaceById } from "./util";

export interface State {
  spaceProviders?: Record<string, SpaceProviderNS.SpaceProvider> | null;
  isLoadingProviders: boolean;
  isConnectingToProvider: string | null;
  hasLoadedProviders: boolean;

  isLoadingProviderSpaces: boolean;
}

declare module "./index" {
  interface SpacesState extends State {}
}

export const state = (): State => ({
  // metadata of all available space providers and their spaces (including local)
  spaceProviders: null,

  isLoadingProviders: false,
  isConnectingToProvider: null,
  hasLoadedProviders: false,

  isLoadingProviderSpaces: false,
});

export const mutations: MutationTree<SpacesState> = {
  setIsLoadingProviders(state, value: boolean) {
    state.isLoadingProviders = value;
  },

  setIsConnectingToProvider(state, value: string | null) {
    state.isConnectingToProvider = value;
  },

  setHasLoadedProviders(state, value: boolean) {
    state.hasLoadedProviders = value;
  },

  updateSpaceProvider(
    state,
    {
      id,
      value,
    }: { id: string; value: Partial<SpaceProviderNS.SpaceProvider> },
  ) {
    state.spaceProviders = {
      ...state.spaceProviders,
      [id]: { ...(state.spaceProviders ?? {})[id], ...value },
    };
  },

  setSpaceProviders(
    state,
    value: Record<string, SpaceProviderNS.SpaceProvider>,
  ) {
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
    { keepLocalSpace = true } = {},
  ) {
    if (state.isLoadingProviders) {
      return;
    }

    if (state.spaceProviders) {
      const localSpace =
        state.spaceProviders[localRootProjectPath.spaceProviderId];

      const spaceProviders = keepLocalSpace
        ? { [localRootProjectPath.spaceProviderId]: localSpace }
        : null;

      commit("setSpaceProviders", spaceProviders);
    }

    dispatch("fetchAllSpaceProviders");
  },

  fetchAllSpaceProviders({ commit, state }) {
    if (state.isLoadingProviders) {
      return;
    }

    commit("setIsLoadingProviders", true);

    // provider fetch happens async, so the payload will be received via a
    // `SpaceProvidersResponseEvent` which will then call the `setAllSpaceProviders`
    // action
    API.desktop.getSpaceProviders();
  },

  async setAllSpaceProviders(
    { commit, dispatch },
    spaceProviders: Record<string, SpaceProviderNS.SpaceProvider>,
  ) {
    try {
      const connectedProviderIds = Object.values(spaceProviders)
        .filter(
          ({ connected, connectionMode }) =>
            connected || connectionMode === "AUTOMATIC",
        )
        .map(({ id }) => id);

      for (const id of connectedProviderIds) {
        const spacesData = await dispatch("fetchProviderSpaces", { id });
        spaceProviders[id] = {
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
      commit("setIsLoadingProviders", false);
    }
  },

  async fetchProviderSpaces(_, { id }) {
    try {
      return await API.space.getSpaceProvider({ spaceProviderId: id });
    } catch (error) {
      consola.error("Error fetching provider spaces", { error });
      throw error;
    }
  },

  async reloadProviderSpaces({ commit, dispatch, state }, { id }) {
    if (!state.spaceProviders) {
      return;
    }

    try {
      state.isLoadingProviderSpaces = true;

      const spaceProvider = state.spaceProviders[id];
      const spacesData = await dispatch("fetchProviderSpaces", { id });

      commit("updateSpaceProvider", {
        id,
        value: { ...spaceProvider, ...spacesData },
      });

      state.isLoadingProviderSpaces = false;
    } catch (error) {
      state.isLoadingProviderSpaces = false;
      consola.error(
        "action::reloadProviderSpaces -> Error reloading provider spaces",
        { error },
      );
      throw error;
    }
  },
};

export const getters: GetterTree<SpacesState, RootStoreState> = {
  getProviderInfoFromProjectPath:
    (state) =>
    (projectId: string): SpaceProviderNS.SpaceProvider | {} => {
      // spaces data has not been cached or providers are not yet loaded
      if (
        !state.projectPath.hasOwnProperty(projectId) ||
        !state.spaceProviders
      ) {
        return {};
      }

      const { spaceProviderId } = state.projectPath[projectId];

      return state.spaceProviders[spaceProviderId] || {};
    },

  activeProjectProvider: (state, _getters, rootState, rootGetters) => {
    const isUnknownProject: (projectId: string) => boolean =
      rootGetters["application/isUnknownProject"];

    if (isUnknownProject(rootState.application.activeProjectId ?? "")) {
      return null;
    }

    const activeProjectOrigin: SpaceItemReference =
      rootGetters["application/activeProjectOrigin"];

    const providers = state.spaceProviders ?? {};
    const activeProjectProvider = providers[activeProjectOrigin.providerId];

    return activeProjectProvider ?? null;
  },

  getSpaceInfo:
    (state, getters) =>
    (projectId: string): SpaceProviderNS.Space | {} => {
      // spaces data has not been cached or providers are not yet loaded
      if (
        !state.projectPath.hasOwnProperty(projectId) ||
        !state.spaceProviders
      ) {
        return {};
      }

      const { spaceId } = state.projectPath[projectId];
      const spaceProvider: SpaceProviderNS.SpaceProvider =
        getters.getProviderInfoFromProjectPath(projectId);

      const space = findSpaceById(
        { [spaceProvider.id]: spaceProvider },
        spaceId,
      );

      return space ?? {};
    },
};
