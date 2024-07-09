import type { ActionTree, GetterTree, MutationTree } from "vuex";
import type { RootStoreState } from "../types";
import type { ApplicationState } from "./index";
import type { SmartLoaderProps } from "@/components/common/SmartLoader.vue";
export type GlobalLoaderConfig = SmartLoaderProps;

interface State {
  globalLoader: GlobalLoaderConfig;
}

declare module "./index" {
  interface ApplicationState extends State {}
}

export const state = (): State => ({
  globalLoader: {
    loading: false,
    text: "",
    displayMode: "fullscreen",
  },
});

export const mutations: MutationTree<ApplicationState> = {};

export const actions: ActionTree<ApplicationState, RootStoreState> = {
  updateGlobalLoader({ state }, config: GlobalLoaderConfig) {
    state.globalLoader = { ...config };
  },
};

export const getters: GetterTree<ApplicationState, RootStoreState> = {};
