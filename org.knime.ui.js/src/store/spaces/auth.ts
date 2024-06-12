import type { ActionTree, GetterTree, MutationTree } from "vuex";
import type { Router } from "vue-router";

import { API } from "@api";
import { SpaceProviderNS } from "@/api/custom-types";
import { APP_ROUTES } from "@/router/appRoutes";

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
      commit("setIsConnectingToProvider", spaceProviderId);
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
      return spacesData;
    } catch (error) {
      consola.error("Error connecting to provider", { error });
      throw error;
    } finally {
      commit("setIsConnectingToProvider", null);
    }
  },

  async disconnectProvider(
    { commit, state },
    { spaceProviderId, $router }: { spaceProviderId: string; $router: Router },
  ) {
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

      if (!spaceProviders) {
        return null;
      }

      const { spaceGroups, ...otherProperties } =
        spaceProviders[spaceProviderId];

      commit("setSpaceProviders", {
        ...state.spaceProviders,
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
