import type { ActionTree, GetterTree, MutationTree } from "vuex";
import type { RootStoreState } from "../types";
import type { ApplicationState } from "./index";

interface State {
  /**
   * Indicates whether the browser has support (enabled) for the Clipboard API or not
   */
  hasClipboardSupport: boolean;
  /**
   * Indicates whether node recommendations are available or not
   */
  hasNodeRecommendationsEnabled: boolean;
  /*
   * If true, a node collection is configured on the preference page. The node search will show the nodes of the
   * collection first and the category groups and node recommendations will only show nodes from the collection.
   */
  hasNodeCollectionActive: null;
  /**
   * If true, the mouse wheel should be used for zooming instead of scrolling
   */
  scrollToZoomEnabled: boolean;
  /*
   * If true, dev mode specifics buttons will be shown.
   */
  devMode: boolean;
}

declare module "./index" {
  interface ApplicationState extends State {}
}

export const state = (): State => ({
  hasClipboardSupport: false,
  hasNodeRecommendationsEnabled: false,
  hasNodeCollectionActive: null,
  scrollToZoomEnabled: false,
  devMode: false,
});

export const mutations: MutationTree<ApplicationState> = {
  setHasClipboardSupport(state, hasClipboardSupport) {
    state.hasClipboardSupport = hasClipboardSupport;
  },
  setHasNodeRecommendationsEnabled(state, hasNodeRecommendationsEnabled) {
    state.hasNodeRecommendationsEnabled = hasNodeRecommendationsEnabled;
  },
  setScrollToZoomEnabled(state, scrollToZoomEnabled) {
    state.scrollToZoomEnabled = scrollToZoomEnabled;
  },
  setHasNodeCollectionActive(state, hasNodeCollectionActive) {
    state.hasNodeCollectionActive = hasNodeCollectionActive;
  },
  setDevMode(state, devMode) {
    state.devMode = devMode;
  },
};

export const actions: ActionTree<ApplicationState, RootStoreState> = {};
export const getters: GetterTree<ApplicationState, RootStoreState> = {};
