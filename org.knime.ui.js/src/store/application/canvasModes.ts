import type { ActionTree, GetterTree, MutationTree } from "vuex";
import type { RootStoreState } from "../types";
import type { ApplicationState } from "./index";

type CanvasMode = "selection" | "pan" | "annotation";

interface State {
  /**
   * an object that defines the current canvas mode
   */
  canvasMode: CanvasMode;
}

declare module "./index" {
  interface ApplicationState extends State {}
}

export const state = (): State => ({
  canvasMode: "selection",
});

export const mutations: MutationTree<ApplicationState> = {
  setCanvasMode(state, value: CanvasMode) {
    state.canvasMode = value;
  },
};

export const actions: ActionTree<ApplicationState, RootStoreState> = {
  resetCanvasMode({ commit }) {
    commit("setCanvasMode", "selection");
  },

  switchCanvasMode({ commit }, value: CanvasMode) {
    commit("setCanvasMode", value);
  },

  toggleAnnotationMode({ getters, commit }) {
    commit(
      "setCanvasMode",
      getters.hasAnnotationModeEnabled ? "selection" : "annotation"
    );
  },

  togglePanMode({ getters, commit }) {
    commit("setCanvasMode", getters.hasPanModeEnabled ? "selection" : "pan");
  },
};

export const getters: GetterTree<ApplicationState, RootStoreState> = {
  hasAnnotationModeEnabled(state) {
    return state.canvasMode === "annotation";
  },

  hasSelectionModeEnabled(state) {
    return state.canvasMode === "selection";
  },

  hasPanModeEnabled(state) {
    return state.canvasMode === "pan";
  },
};
