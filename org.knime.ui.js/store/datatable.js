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
    async load({ commit }, { projectId, nodeId, portIndex }) {
        let table = await loadTable({ projectId, nodeId, portIndex });
        commit('setTable', table);
    },
    clear({ commit }) {
        commit('clear');
    }
};
