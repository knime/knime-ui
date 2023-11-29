import type { ActionTree, GetterTree, MutationTree } from "vuex";

import { API } from "@api";
import { SpaceProviderNS } from "@/api/custom-types";

import type { RootStoreState } from "../types";
import type { SpacesState } from "./index";

export interface State {}

declare module "./index" {
  interface SpacesState extends State {}
}

export const state = (): State => ({});

export const mutations: MutationTree<SpacesState> = {};

export const actions: ActionTree<SpacesState, RootStoreState> = {
  async connectProvider({ dispatch, commit }, { spaceProviderId }) {
    try {
      commit("setIsLoadingProvider", true);
      // returns the provider metadata (but no spaces)
      const spaceProvider = await API.desktop.connectSpaceProvider({
        spaceProviderId,
      });
      // fetch the spaces if we are now connected
      const spacesData = spaceProvider?.connected
        ? await dispatch("fetchProviderSpaces", {
            id: spaceProviderId,
          })
        : {};
      commit("updateSpaceProvider", {
        id: spaceProviderId,
        value: { ...spaceProvider, ...spacesData },
      });
    } catch (error) {
      consola.error("Error connecting to provider", { error });
      throw error;
    } finally {
      commit("setIsLoadingProvider", false);
    }
  },

  async disconnectProvider({ commit, state }, { spaceProviderId }) {
    try {
      await API.desktop.disconnectSpaceProvider({ spaceProviderId });

      const projectsWithDisconnectedProvider = Object.entries(
        state.projectPath,
      ).flatMap(([projectId, path]) =>
        path.spaceProviderId === spaceProviderId ? [projectId] : [],
      );

      // update project paths that used this space provider
      projectsWithDisconnectedProvider.forEach((projectId) =>
        commit("setProjectPath", {
          projectId,
          value: {
            spaceProviderId: "local",
            spaceId: "local",
            itemId: "root",
          },
        }),
      );

      // update space provider state
      const { spaceProviders } = state;
      const {
        spaces: _,
        user: __,
        ...skeleton
      } = spaceProviders[spaceProviderId];
      commit("setSpaceProviders", {
        ...state.spaceProviders,
        [spaceProviderId]: {
          ...skeleton,
          connected: false,
        },
      });

      return spaceProviderId;
    } catch (error) {
      consola.error("Error disconnecting from provider", { error });
      throw error;
    }
  },
};

export const getters: GetterTree<SpacesState, RootStoreState> = {
  hasActiveHubSession({ spaceProviders }) {
    if (!spaceProviders) {
      return false;
    }

    return Boolean(
      Object.values(spaceProviders).find(
        ({ connected, type }) =>
          type !== SpaceProviderNS.TypeEnum.LOCAL && connected,
      ),
    );
  },
};
