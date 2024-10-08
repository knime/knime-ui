import type { ActionTree, GetterTree, MutationTree } from "vuex";

import type { RootStoreState } from "../types";

import type { ApplicationState } from "./index";

export interface GlobalLoaderConfig {
  /**
   * Loading state
   */
  loading?: boolean;
  /**
   * Text displayed below or besides the animated loading icon
   */
  text?: string;
  /**
   * determines the loader's appearance
   */
  displayMode?: "fullscreen" | "floating";
  /**
   * whether to use standard load without delay, or a staggered loader
   */
  loadingMode?: "stagger" | "normal";
  /**
   * number of stages to stagger for.
   */
  staggerStageCount?: 1 | 2;
}

interface State {
  globalLoader: GlobalLoaderConfig;
}

declare module "./index" {
  interface ApplicationState extends State {}
}

export const state = (): State => ({
  globalLoader: {
    loading: false,
  },
});

export const mutations: MutationTree<ApplicationState> = {};

export const actions: ActionTree<ApplicationState, RootStoreState> = {
  updateGlobalLoader({ state }, config: GlobalLoaderConfig) {
    state.globalLoader = { ...config };
  },
};

export const getters: GetterTree<ApplicationState, RootStoreState> = {};
