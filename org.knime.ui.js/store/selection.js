import Vue from 'vue';

/**
 * Store that holds selected objects (nodes, connections)
 */

export const state = () => ({
    selectedNodes: {},
    selectedConnections: {},
    isDraggin: false
});

export const mutations = {

    // Add each node of the provided nodes object to the selected nodes object.
    // This selected node object does keeps the id, the allowed actions, the kind, the outPorts
    // and the node state of the nodes.
    addNodesToSelection(state, nodes) {
        Object.values(nodes).forEach(({ id, allowedActions, kind, outPorts, state: nodeState }) => {
            Vue.set(state.selectedNodes, id, { id, allowedActions, kind, outPorts, state: nodeState });
        });
    },

    // Removes each node of the provided nodes object to the selected nodes object.
    removeNodesFromSelection(state, nodes) {
        Object.values(nodes).forEach((node) => {
            Vue.delete(state.selectedNodes, node.id);
        });
    },

    // Add each connection of the provided connections object to the selected connections object.
    // This selected connection object does only keep the id and the can delete attribute of the connection.
    addConnectionsToSelection(state, connections) {
        Object.values(connections).forEach(({ id, canDelete }) => {
            Vue.set(state.selectedConnections, id, { id, canDelete });
        });
    },

    // Removes each connection of the provided connections object to the selected connection object..
    removeConnectionsFromSelection(state, connections) {
        Object.values(connections).forEach((connection) => {
            Vue.delete(state.selectedConnections, connection.id);
        });
    },
    setDragging(state, isDragging) {
        state.isDragging = isDragging;
    }
};

export const actions = {

    // Deselect all objects, this includes connections and nodes.
    deselectAllObjects({ commit, state }) {
        commit('removeNodesFromSelection', state.selectedNodes);
        commit('removeConnectionsFromSelection', state.selectedConnections);
    },

    // Selects all nodes that are present in the current workflow store.
    selectAllNodes({ commit, rootState }) {
        commit('addNodesToSelection', rootState.workflow.activeWorkflow.nodes);
    },

    // Selects the given node.
    selectNode({ commit }, node) {
        commit('addNodesToSelection', { node });
    },

    // Deselects the given node.
    deselectNode({ commit }, node) {
        commit('removeNodesFromSelection', { node });
    },

    // Selects the given connection.
    selectConnection({ commit }, connection) {
        commit('addConnectionsToSelection', { connection });
    },

    // Deselects the given connection.
    deselectConnection({ commit }, connection) {
        commit('removeConnectionsFromSelection', { connection });
    }
};

export const getters = {

    // Returns an array of all selected node ids.
    selectedNodeIds: (state) => Object.keys(state.selectedNodes),

    // Returns an array of selected node objects.
    selectedNodes: (state) => {
        let nodeObjects = [];
        Object.keys(state.selectedNodes).forEach((node) => {
            nodeObjects.push(state.selectedNodes[node]);
        });
        return nodeObjects;
    },

    // Checks if a given node id is present in the selected object.
    isNodeSelected: (state) => (nodeId) =>  Reflect.has(state.selectedNodes, nodeId),

    // Returns an array of all selected connection ids.
    selectedConnectionIds: (state) => Object.keys(state.selectedConnections),

    // Returns an array of selected connection objects.
    selectedConnections: (state) => {
        let connectionObjects = [];
        Object.keys(state.selectedConnections).forEach((connection) => {
            connectionObjects.push(state.selectedConnections[connection]);
        });
        return connectionObjects;
    },

    // Checks if a given connetction id is present in the selected object.
    isConnectionSelected: (state) => (connectionId) => Reflect.has(state.selectedConnections, connectionId)
};
