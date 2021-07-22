import Vue from 'vue';

/**
 * Store that holds selected objects (nodes, connections)
 */

export const state = () => ({
    /**
     * Selected nodes object. If key exists it means it is selected.
     * @type {Object.<string, boolean>}
     */
    selectedNodes: {},
    /**
    * @type {Object.<string, boolean>}
     */
    selectedConnections: {}
});

export const mutations = {

    // Add nodes to selection by nodeIds
    addNodesToSelection(state, nodeIds) {
        nodeIds.forEach(id => Vue.set(state.selectedNodes, id, true));
    },

    // Removes each node of the provided nodeIds array from the selected nodes
    removeNodesFromSelection(state, nodeIds) {
        nodeIds.forEach(id => Vue.delete(state.selectedNodes, id));
    },

    // Clear the selected nodes and the selected connections at once
    clearSelection(state) {
        state.selectedNodes = {};
        state.selectedConnections = {};
    },

    //  Add connection to selection.
    addConnectionsToSelection(state, connectionIds) {
        connectionIds.forEach(id => Vue.set(state.selectedConnections, id, true));
    },

    // Removes each connection of the provided connections object to the selected connection object.
    removeConnectionsFromSelection(state, connectionIds) {
        connectionIds.forEach(id => {
            Vue.delete(state.selectedConnections, id);
        });
    }
};

export const actions = {

    // Deselect all objects, this includes connections and nodes.
    deselectAllObjects({ commit }) {
        commit('clearSelection');
    },

    // Selects all nodes that are present in the current workflow store.
    selectAllNodes({ commit, rootState }) {
        commit('addNodesToSelection', Object.keys(rootState.workflow.activeWorkflow.nodes));
    },

    // Selects the given node.
    selectNode({ commit }, nodeId) {
        commit('addNodesToSelection', [nodeId]);
    },

    // Deselects the given node.
    deselectNode({ commit }, nodeId) {
        commit('removeNodesFromSelection', [nodeId]);
    },

    // Selects the given connection.
    selectConnection({ commit }, connectionId) {
        commit('addConnectionsToSelection', [connectionId]);
    },

    // Deselects the given connection.
    deselectConnection({ commit }, connectionId) {
        commit('removeConnectionsFromSelection', [connectionId]);
    }
};

export const getters = {

    // Returns an array of all selected node ids.
    selectedNodeIds: (state) => Object.keys(state.selectedNodes),

    // Returns an array of selected node objects.
    selectedNodes(state, getters, rootState) {
        return Object.keys(state.selectedNodes).map(
            (nodeId) => rootState.workflow.activeWorkflow?.nodes[nodeId]
        ).filter(Boolean);
    },

    // Checks if a given node id is present in the selected object.
    isNodeSelected: (state) => (nodeId) => Reflect.has(state.selectedNodes, nodeId),

    // Returns an array of all selected connection ids.
    selectedConnectionIds: (state) => Object.keys(state.selectedConnections),

    // Returns an array of selected connection objects.
    selectedConnections(state, getters, rootState) {
        // for some unknown reasons the connection object in the activeWorkflow does not contain the id
        return Object.keys(state.selectedConnections).map(
            (id) => ({ id, ...rootState.workflow.activeWorkflow?.connections[id] })
        ).filter(Boolean);
    },

    // Checks if a given connection id is present in the selected object.
    isConnectionSelected: (state) => (connectionId) => Reflect.has(state.selectedConnections, connectionId)
};
