import type { ActionTree, GetterTree, MutationTree } from "vuex";

import { API } from "@/api";
import { SpaceProviderNS } from "@/api/custom-types";
import { StoreActionException } from "@/api/gateway-api/exceptions";
import {
  NetworkException,
  ServiceCallException,
  type SpaceItemReference,
} from "@/api/gateway-api/generated-api";
import { createUnwrappedPromise } from "@/util/createUnwrappedPromise";
import type { RootStoreState } from "../types";

import { localRootProjectPath } from "./caching";
import type { SpacesState } from "./index";
import { findSpaceById } from "./util";

export interface State {
  /**
   * Record of all the providers currently available
   */
  spaceProviders?: Record<string, SpaceProviderNS.SpaceProvider> | null;
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

declare module "./index" {
  interface SpacesState extends State {}
}

export const state = (): State => ({
  // metadata of all available space providers and their spaces (including local)
  spaceProviders: null,
  isLoadingProviders: false,
  isConnectingToProvider: null,
  hasLoadedProviders: false,
  loadingProviderSpacesData: {},
});

export const mutations: MutationTree<SpacesState> = {
  setIsLoadingProviders(state, value: boolean) {
    state.isLoadingProviders = value;
  },

  setLoadingProviderData(
    state,
    { id, loading }: { id: string; loading: boolean },
  ) {
    state.loadingProviderSpacesData[id] = loading;
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

    const spacesData = await dispatch("fetchProviderSpaces", {
      id: localRootProjectPath.spaceProviderId,
    });

    consola.trace("action::loadLocalSpace. Loaded data", { spacesData });

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

    consola.trace("action::fetchAllSpaceProviders");

    // provider fetch happens async, so the payload will be received via a
    // `SpaceProvidersResponseEvent` which will then call the `setAllSpaceProviders`
    // action
    API.desktop.getSpaceProviders();
  },

  setAllSpaceProviders(
    { commit, dispatch },
    spaceProviders: Record<string, SpaceProviderNS.SpaceProvider>,
  ) {
    const connectedProviderIds = Object.values(spaceProviders)
      .filter(
        ({ connected, connectionMode }) =>
          connected || connectionMode === "AUTOMATIC",
      )
      .map(({ id }) => id);

    // add the providers without data to make them visible
    commit("setSpaceProviders", spaceProviders);
    commit("setIsLoadingProviders", false);

    consola.trace("action::setAllSpaceProviders -> Fetching provider spaces", {
      connectedProviderIds,
    });

    const successfulProviderIds: string[] = [];
    const failedProviderIds: string[] = [];

    const { promise, resolve } = createUnwrappedPromise<{
      successfulProviderIds: string[];
      failedProviderIds: string[];
    }>();

    const dataLoadQueue: Promise<unknown>[] = [];

    for (const id of connectedProviderIds) {
      const loadDataPromise = dispatch("fetchProviderSpaces", { id })
        .then((spacesData) => {
          successfulProviderIds.push(id);
          commit("updateSpaceProvider", {
            id,
            value: { ...spaceProviders[id], ...spacesData },
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
          commit("updateSpaceProvider", {
            id,
            value: { ...spaceProviders[id], connected: false },
          });
        });

      dataLoadQueue.push(loadDataPromise);
    }

    Promise.allSettled(dataLoadQueue).then(() => {
      commit("setHasLoadedProviders", true);
      resolve({ successfulProviderIds, failedProviderIds });
    });

    return promise;
  },

  async fetchProviderSpaces({ commit }, { id }) {
    try {
      commit("setLoadingProviderData", { id, loading: true });

      const data = await API.space.getSpaceProvider({ spaceProviderId: id });

      consola.info("action::fetchProviderSpaces", {
        params: { id },
        response: data,
      });

      return data;
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
    } finally {
      commit("setLoadingProviderData", { id, loading: false });
    }
  },

  async reloadProviderSpaces({ commit, dispatch, state }, { id }) {
    if (!state.spaceProviders) {
      return;
    }

    try {
      consola.trace(
        "action::reloadProviderSpaces -> reloading provider spaces",
        { spaceProviderId: id },
      );

      const spaceProvider = state.spaceProviders[id];
      const spacesData = await dispatch("fetchProviderSpaces", { id });

      commit("updateSpaceProvider", {
        id,
        value: { ...spaceProvider, ...spacesData },
      });
    } catch (error) {
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
