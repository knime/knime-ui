import type { ActionTree, GetterTree, MutationTree } from "vuex";

import type { RootStoreState } from "../types";

import type { ApplicationState } from "./index";

interface State {
  /**
   * an object that maps projectIds to the isDirty flag of the workflow
   */
  dirtyProjectsMap: Record<string, boolean>;
}

declare module "./index" {
  interface ApplicationState extends State {}
}

export const state = (): State => ({
  dirtyProjectsMap: {},
});

export const mutations: MutationTree<ApplicationState> = {
  setDirtyProjectsMap(state, dirtyProjectsMap) {
    state.dirtyProjectsMap = dirtyProjectsMap;
  },
};

export const actions: ActionTree<ApplicationState, RootStoreState> = {
  setDirtyProjectsMap({ commit }, dirtyProjectsMap) {
    commit("setDirtyProjectsMap", dirtyProjectsMap);
  },
  updateDirtyProjectsMap({ state, commit }, dirtyProjectsMap) {
    const updatedDirtyProjectsMap = {
      ...state.dirtyProjectsMap,
      ...dirtyProjectsMap,
    };
    commit("setDirtyProjectsMap", updatedDirtyProjectsMap);
  },
};

export const getters: GetterTree<ApplicationState, RootStoreState> = {};
