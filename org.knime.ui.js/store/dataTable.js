/**
 * Store holding data of one of a node's output ports
 */

import { loadTable } from '~api';
import Vue from 'vue';

const firstRows = 100; // batch size for initial load
const moreRows = 450; // batch size for lazy loading

export const state = () => ({
    rows: null,
    totalNumRows: 0,
    cellTypes: {},
    columns: null,
    totalNumColumns: 0,

    // table identification
    projectId: null,
    nodeId: null,
    portIndex: null,

    // current state
    isReady: false,
    isLoading: false
});

export const mutations = {
    setIsLoading(state, value) {
        state.isLoading = value;
    },
    /*
     * indicates whether table has been loaded
     */
    setIsReady(state, value) {
        state.isReady = value;
    },
    /*
     * saved for action loadMoreRows
     */
    setTableIdentifier(state, { projectId, nodeId, portIndex }) {
        state.projectId = projectId;
        state.nodeId = nodeId;
        state.portIndex = portIndex;
    },
    setTable(state, { rows, totalNumRows, spec: { cellTypes, columns, totalNumColumns } }) {
        state.rows = rows;
        state.totalNumRows = totalNumRows; // for vertical pagination
        state.cellTypes = cellTypes;
        state.columns = columns;
        state.totalNumColumns = totalNumColumns; // for horizontal pagination
    },
    appendRows(state, rows) {
        // Can be null if node has been deselected before api call returns
        if (state.rows) {
            state.rows.push(...rows);
        }
    },
    clear(state) {
        state.rows = null;
        state.totalNumRows = 0;
        state.cellTypes = {};
        state.columns = null;
        state.totalNumColumns = 0;

        state.projectId = null;
        state.nodeId = null;
        state.portIndex = null;

        state.isLoading = false;
        state.isReady = false;
    }
};

export const getters = {
    /*
        returns true if table has no end or if not all rows have been loaded yet
     */
    canLoadMoreRows(state) {
        return state.totalNumRows === -1 || state.totalNumRows > state.rows?.length;
    }
};

export const actions = {
    async load({ commit }, { projectId, nodeId, portIndex }) {
        // indicate loading
        commit('setIsLoading', true);

        // load table
        let table = await loadTable({ projectId, nodeId, portIndex, batchSize: firstRows });

        // loading done
        commit('setIsLoading', false);
        commit('setIsReady', true);

        // layouting starts
        commit('setTableIdentifier', { projectId, nodeId, portIndex });
        commit('setTable', table);
    },
    async loadMoreRows({ commit, state: { projectId, nodeId, portIndex, rows } }) {
        consola.trace('loading more table rows');

        // indicate loading
        commit('setIsLoading', true);

        // load more rows
        try {
            let table = await loadTable({ projectId, nodeId, portIndex, offset: rows.length, batchSize: moreRows });
            if (!table?.rows) {
                throw new Error();
            }
            commit('appendRows', table.rows);
        } finally {
            // indicate loading finished
            commit('setIsLoading', false);
        }
    },
    clear({ commit }) {
        commit('clear');
    }
};
