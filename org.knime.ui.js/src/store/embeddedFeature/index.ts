import type { MutationTree } from "vuex";

export interface EmbeddedFeatureState {
  url: string | null;
}

export const state = (): EmbeddedFeatureState => ({
  url: null,
});

export const mutations: MutationTree<EmbeddedFeatureState> = {
  setUrl(state, value) {
    state.url = value;
  },
};
