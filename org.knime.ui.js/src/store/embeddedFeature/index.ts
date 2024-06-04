import type { MutationTree } from "vuex";

export interface EmbeddedFeatureState {
  isExpanded: boolean;
}

export const state = (): EmbeddedFeatureState => ({
  isExpanded: false,
});

export const mutations: MutationTree<EmbeddedFeatureState> = {
  setIsExpanded(state, value) {
    state.isExpanded = value;
  },
};
