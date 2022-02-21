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

    // Add nodeIds to selection
    addNodesToSelection(state, nodeIds) {
        // Work on a copy of the state. The vue reactivity-machinery only runs once afterwards
        let selectedNodes = { ...state.selectedNodes };
        nodeIds.forEach(id => { selectedNodes[id] = true; });

        state.selectedNodes = selectedNodes;
    },

    // Removes each node of the provided nodeIds array from the selected nodes
    removeNodesFromSelection(state, nodeIds) {
        // Work on a copy of the state. The vue reactivity-machinery only runs once afterwards
        let selectedNodes = { ...state.selectedNodes };
        nodeIds.forEach(id => { delete selectedNodes[id]; });

        state.selectedNodes = selectedNodes;
    },

    // Clear the selected nodes and the selected connections at once
    clearSelection(state) {
        if (Object.keys(state.selectedNodes).length > 0) {
            state.selectedNodes = {};
        }
        if (Object.keys(state.selectedConnections).length > 0) {
            state.selectedConnections = {};
        }
    },

    //  Add connectionIds to selection.
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

    // Selects all nodeIds
    selectNodes({ commit }, nodeIds) {
        commit('addNodesToSelection', nodeIds);
    },

    // Deselects the given node.
    deselectNode({ commit }, nodeId) {
        commit('removeNodesFromSelection', [nodeId]);
    },

    // Deselects all nodeIds
    deselectNodes({ commit }, nodeIds) {
        commit('removeNodesFromSelection', nodeIds);
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
        if (!rootState.workflow.activeWorkflow) {
            return [];
        }
        return Object.keys(state.selectedNodes).map(
            (nodeId) => rootState.workflow.activeWorkflow.nodes[nodeId] ||
                consola.error(`Selected node '${nodeId}' not found in activeWorkflow`)
        );
    },

    // Returns null if none or multiple nodes are selected, otherwise returns the selected node
    singleSelectedNode(state, { selectedNodes }) {
        if (selectedNodes.length !== 1) { return null; }
        return selectedNodes[0];
    },

    // Checks if a given node id is present in the selected object.
    isNodeSelected: (state) => (nodeId) => nodeId in state.selectedNodes,

    // Returns an array of selected connection objects.
    selectedConnections(state, getters, { workflow: { activeWorkflow } }) {
        if (!activeWorkflow) {
            return [];
        }

        return Object.keys(state.selectedConnections)
            .map(id => activeWorkflow.connections[id] ||
                consola.error(`Selected connection '${id}' not found in activeWorkflow`))
            .filter(Boolean); // after deleting a selected connection, it will be undefined
    },

    // Checks if a given connection id is present in the selected object.
    isConnectionSelected: (state) => (connectionId) => Reflect.has(state.selectedConnections, connectionId)
};
