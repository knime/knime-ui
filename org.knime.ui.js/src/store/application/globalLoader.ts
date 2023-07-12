import type { ActionTree, GetterTree, MutationTree } from "vuex";
import type { RootStoreState } from "../types";
import type { ApplicationState } from "./index";

export interface GlobalLoaderConfig {
  /**
   * determines the loader's appeareance
   */
  displayMode?: "fullscreen" | "localized" | "toast" | "transparent";
  /**
   * whether to use standard load without delay, or a staggered loader
   */
  loadingMode?: "stagger" | "normal";
  /**
   * number of stages to stagger for.
   */
  staggerStageCount?: 1 | 2;
  /**
   * initialize the loader size with these values (only applies to 'localized' displayMode)
   */
  initialDimensions?: {
    width?: string;
    height?: string;
  };
}

interface State {
  globalLoader: {
    loading: boolean;
    text: string;
    config: GlobalLoaderConfig;
  };
}

declare module "./index" {
  interface ApplicationState extends State {}
}

export const state = (): State => ({
  globalLoader: {
    loading: false,
    text: "",
    config: { displayMode: "fullscreen" },
  },
});

export const mutations: MutationTree<ApplicationState> = {};

export const actions: ActionTree<ApplicationState, RootStoreState> = {
  updateGlobalLoader({ state }, { loading, text, config }) {
    state.globalLoader = {
      loading,
      text,
      config: config || { displayMode: "fullscreen" },
    };
  },
};

export const getters: GetterTree<ApplicationState, RootStoreState> = {};
