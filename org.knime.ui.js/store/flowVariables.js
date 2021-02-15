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
    /**
     * Load flowVariables of the given port / node, and also clear the loaded data table
     * (only one of the tables flowVariables/data can be shown at a time)
     * @param {String} projectId Project ID
     * @param {String} nodeId Node ID
     * @param {Number} portIndex Index of the selected port
     * @returns {void}
     */
    async load({ commit, dispatch }, { projectId, nodeId, portIndex }) {
        dispatch('dataTable/clear');
        let flowVariables = await loadFlowVariables({ projectId, nodeId, portIndex });
        commit('setFlowVariables', flowVariables);
    },
    clear({ commit }) {
        commit('clear');
    }
};
