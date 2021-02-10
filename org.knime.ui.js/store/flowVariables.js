/**
 * Store holding flow variables of the node
 */

import { loadFlowVariables } from '~api';

export const state = () => ({
    flowVariables: null
});

export const mutations = {
    setFlowVariables(state, flowVariables) {
        state.flowVariables = flowVariables;
    },

    clear(state) {
        state.flowVariables = null;

    }
};

export const actions = {
    async load({ commit }, { projectId, nodeId, portIndex }) {
        let flowVariables = await loadFlowVariables({ projectId, nodeId, portIndex });
        commit('setFlowVariables', flowVariables);
    },
    clear({ commit }) {
        commit('clear');
    }
};
