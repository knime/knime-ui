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
   * collection first and the tag groups and node recommendations will only show nodes from the collection.
   */
  hasNodeCollectionActive: null;
  /**
   * Name of the currently active node collection.
   * @type {string}
   * @memberof AppState
   */
  activeNodeCollection: string;
  /**
   * If true, the mouse wheel should be used for zooming instead of scrolling
   */
  scrollToZoomEnabled: boolean;
  /*
   * If true, dev mode specifics buttons will be shown.
   */
  devMode: boolean;
  /*
   * Wheter to enable the locking of metanodes and components
   */
  isSubnodeLockingEnabled: boolean;
  /*
   * Wheter to use embedded node configuration dialogs
   */
  useEmbeddedDialogs: boolean;
}

declare module "./index" {
  interface ApplicationState extends State {}
}

export const state = (): State => ({
  hasClipboardSupport: false,
  hasNodeRecommendationsEnabled: false,
  hasNodeCollectionActive: null,
  activeNodeCollection: "",
  scrollToZoomEnabled: false,
  devMode: false,
  isSubnodeLockingEnabled: false,
  useEmbeddedDialogs: true,
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
  setActiveNodeCollection(state, activeNodeCollection) {
    state.activeNodeCollection = activeNodeCollection;
  },
  setDevMode(state, devMode) {
    state.devMode = devMode;
  },
  setIsSubnodeLockingEnabled(state, isSubnodeLockingEnabled) {
    state.isSubnodeLockingEnabled = isSubnodeLockingEnabled;
  },
  setUseEmbeddedDialogs(state, value) {
    state.useEmbeddedDialogs = value;
  },
};

export const actions: ActionTree<ApplicationState, RootStoreState> = {};
export const getters: GetterTree<ApplicationState, RootStoreState> = {};
