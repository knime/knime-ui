import type { ActionTree, GetterTree, MutationTree } from "vuex";

import { API } from "@/api";
import { SpaceProviderNS } from "@/api/custom-types";
import { StoreActionException } from "@/api/gateway-api/exceptions";
import {
  NetworkException,
  ServiceCallException,
  type SpaceItemReference,
} from "@/api/gateway-api/generated-api";
import type { RootStoreState } from "../types";

import { localRootProjectPath } from "./caching";
import type { SpacesState } from "./index";

export interface State {
  spaceProviders?: Record<string, SpaceProviderNS.SpaceProvider> | null;
  allSpaceGroups: Record<string, SpaceProviderNS.SpaceGroup>;
  allSpaces: Record<string, SpaceProviderNS.Space>;
  providerIndex: Record<string, { spaces: Set<string>; groups: Set<string> }>;

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
  allSpaceGroups: {},
  allSpaces: {},
  providerIndex: {},

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
    consola.trace("action::loadLocalSpace");

    await dispatch("fetchProviderSpaces", {
      id: localRootProjectPath.spaceProviderId,
    });

    const localSpace = {
      id: "local",
      name: "Local space",
      connected: true,
      connectionMode: "AUTOMATIC",
      local: true,
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

    consola.trace("action::fetchAllSpaceProviders");

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

      consola.trace(
        "action::setAllSpaceProviders -> Fetching provider spaces",
        { connectedProviderIds },
      );

      commit("setSpaceProviders", spaceProviders);

      for (const id of connectedProviderIds) {
        await dispatch("fetchProviderSpaces", { id });
      }

      consola.trace(
        "action::setAllSpaceProviders -> Setting providers with space data",
        spaceProviders,
      );
      commit("setHasLoadedProviders", true);
    } catch (error) {
      commit("setHasLoadedProviders", false);
      consola.error("action::setAllSpaceProviders. Error fetching providers", {
        error,
      });
      throw error;
    } finally {
      commit("setIsLoadingProviders", false);
    }
  },

  async fetchProviderSpaces({ state }, { id: spaceProviderId }) {
    try {
      const data = await API.space.getSpaceProvider({ spaceProviderId });

      const { spaceGroups } = data;

      // create index if it doesn't exist
      if (!state.providerIndex[spaceProviderId]) {
        state.providerIndex[spaceProviderId] = {
          spaces: new Set(),
          groups: new Set(),
        };
      }

      const loadedSpaces: string[] = [];

      spaceGroups.forEach((fullgroup) => {
        const { spaces, ...normalizedGroup } = fullgroup;

        state.allSpaceGroups[normalizedGroup.id] = {
          ...normalizedGroup,
          providerId: spaceProviderId,
        };

        state.providerIndex[spaceProviderId].groups.add(normalizedGroup.id);

        spaces.forEach((space) => {
          state.providerIndex[spaceProviderId].spaces.add(space.id);
          loadedSpaces.push(space.id);

          state.allSpaces[space.id] = {
            ...space,
            providerId: spaceProviderId,
            spaceGroupId: normalizedGroup.id,
            private: space._private ?? false,
          };
        });
      });

      consola.info("action::fetchProviderSpaces", {
        params: { spaceProviderId },
        response: data,
      });

      return loadedSpaces;
    } catch (error) {
      const message = "Error fetching provider spaces";
      consola.error(`action::fetchProviderSpaces -> ${message}`, { error });

      if (error instanceof ServiceCallException) {
        throw new StoreActionException(message, error);
      }

      if (error instanceof NetworkException) {
        throw new StoreActionException("Connectivity problem", error);
      }

      throw error;
    }
  },

  async reloadProviderSpaces({ dispatch, state }, { id }) {
    if (!state.spaceProviders) {
      return;
    }

    try {
      state.isLoadingProviderSpaces = true;

      await dispatch("fetchProviderSpaces", { id });

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
    (state) =>
    (projectId: string): SpaceProviderNS.Space | {} => {
      // spaces data has not been cached or providers are not yet loaded
      if (
        !state.projectPath.hasOwnProperty(projectId) ||
        !state.spaceProviders
      ) {
        return {};
      }

      const { spaceId } = state.projectPath[projectId];
      const space = state.allSpaces[spaceId];

      return space ?? {};
    },
};
