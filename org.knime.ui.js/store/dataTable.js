/**
 * Store holding data of one of a node's output ports
 */

import { loadTable } from '~api';

export const state = () => ({
    rows: null,
    totalNumRows: 0,
    cellTypes: {},
    columns: null,
    totalNumColumns: 0
});

export const mutations = {
    setTable(state, { rows, totalNumRows, spec: { cellTypes, columns, totalNumColumns } }) {
        state.rows = rows;
        state.totalNumRows = totalNumRows; // for vertical pagination
        state.cellTypes = cellTypes;
        state.columns = columns;
        state.totalNumColumns = totalNumColumns; // for horizontal pagination
    },

    clear(state) {
        state.rows = null;
        state.totalNumRows = 0;
        state.cellTypes = {};
        state.columns = null;
        state.totalNumColumns = 0;
    }
};

export const actions = {
    /**
     * Load data table of the given port / node, and also clear the loaded flow variables
     * (only one of the tables flowVariables/data can be shown at a time)
     * @param {String} projectId Project ID
     * @param {String} nodeId Node ID
     * @param {Number} portIndex Index of the selected port
     * @returns {void}
     */
    async load({ commit, dispatch }, { projectId, nodeId, portIndex }) {
        dispatch('flowVariables/clear', null, { root: true });
        let table = await loadTable({ projectId, nodeId, portIndex });
        commit('setTable', table);
    },
    clear({ commit }) {
        commit('clear');
    }
};
