/**
 * Store holding data of one of a node's output ports
 */

import { loadTable } from '~api';

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
    isLoading: false,

    // changes whenever the selected node changes
    requestID: 0
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
        state.rows.push(...rows);
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
        state.requestID += 1;
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
    /**
     * Load data table of the given port / node, and also clear the loaded flow variables
     * (only one of the tables flowVariables/data can be shown at a time)
     * @param {String} projectId Project ID
     * @param {String} workflowId Workflow ID
     * @param {String} nodeId Node ID
     * @param {Number} portIndex Index of the selected port
     * @returns {void}
     */
    async load({ commit, dispatch, state }, { projectId, workflowId, nodeId, portIndex }) {
        let { requestID } = state;
        dispatch('flowVariables/clear', null, { root: true });
        // indicate loading
        commit('setIsLoading', true);

        // load table
        let table = await loadTable({ projectId, workflowId, nodeId, portIndex, batchSize: firstRows });
        if (state.requestID !== requestID) {
            return;
        }

        // loading done
        commit('setIsLoading', false);
        commit('setIsReady', true);

        // layouting starts
        commit('setTableIdentifier', { projectId, nodeId, portIndex });
        commit('setTable', table);
    },

    async loadMoreRows({ commit, state }) {
        let { projectId, workflowId, nodeId, portIndex, rows, requestID } = state;
        consola.trace('loading more table rows');

        // indicate loading
        commit('setIsLoading', true);

        // load more rows
        try {
            let table = await loadTable({
                projectId,
                workflowId,
                nodeId,
                portIndex,
                offset: rows.length,
                batchSize: moreRows
            });
            if (!table?.rows) {
                throw new Error('Loaded table contains no rows');
            }

            // if the table has been reset in the meantime the result of this request is ignored
            if (state.requestID === requestID) {
                commit('appendRows', table.rows);
            }
        } finally {
            // indicate loading finished
            commit('setIsLoading', false);
        }
    },
    clear({ commit }) {
        commit('clear');
    }
};
