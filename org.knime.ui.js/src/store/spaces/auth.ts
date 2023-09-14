import { API } from "@api";

import type { ActionTree, GetterTree, MutationTree } from "vuex";
import type { RootStoreState } from "../types";
import type { SpacesState } from "./index";

export interface State {}

declare module "./index" {
  interface SpacesState extends State {}
}

export const state = (): State => ({});

export const mutations: MutationTree<SpacesState> = {};

export const actions: ActionTree<SpacesState, RootStoreState> = {
  connectProvider({ commit }, { spaceProviderId }) {
    try {
      commit("setIsLoadingProvider", true);
      API.desktop.connectSpaceProvider({ spaceProviderId });
      // refetch all space providers and their spaces ensures a correct state (esp. for server connections)
      API.desktop.getSpaceProviders();
    } catch (error) {
      consola.error("Error connecting to provider", { error });
      throw error;
    } finally {
      commit("setIsLoadingProvider", false);
    }
  },

  disconnectProvider({ commit, state }, { spaceProviderId }) {
    try {
      API.desktop.disconnectSpaceProvider({ spaceProviderId });

      // update project paths that used this space provider
      const projectsWithDisconnectedProvider = Object.entries(
        state.projectPath,
      ).flatMap(([projectId, path]) =>
        path.spaceProviderId === spaceProviderId ? [projectId] : [],
      );

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
      const { name, connectionMode } = spaceProviders[spaceProviderId];
      commit("setSpaceProviders", {
        ...state.spaceProviders,
        [spaceProviderId]: {
          id: spaceProviderId,
          name,
          connectionMode,
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
        ({ id, connected }) => id !== "local" && connected,
      ),
    );
  },
};
