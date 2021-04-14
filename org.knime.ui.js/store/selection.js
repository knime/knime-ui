import Vue from 'vue';
/**
 * 
 */
export const state = () => ({
    selectedNodes: {},
    selectedConnections: {},
    isDraggin: false
});

export const mutations = {
    deselectAllNodes(state) {
        state.selectedNodes = {};
    },
    selectAllNodes(state, nodes) {
        Object.values(nodes).forEach(node => {
            Vue.set(state.selectedNodes, node.id, node);
        });
    },
    selectNode(state, node) {
        Vue.set(state.selectedNodes, node.id, node);
    },
    deselectNode(state, nodeId) {
        Vue.delete(state.selectedNodes, nodeId);
    },
    selectConnector(state, connector) {
        Vue.set(state.selectedConnections, connector.id, connector);
    },
    deselectConnector(state, connectorId) {
        Vue.delete(state.selectedConnections, connectorId);
    },
    deselectAllConnectors(state) {
        state.selectedConnections = {};
    },
    setDragging(state, isDragging) {
        state.isDragging = isDragging;
    }
};

export const actions = {
    deselectAllObjects({ commit }) {
        commit('deselectAllNodes');
        commit('deselectAllConnectors');
    }
};

export const getters = {
    selectedNodeIds: (state) => Object.keys(state.selectedNodes),
    isNodeSelected: (state) => (nodeId) =>  Reflect.has(state.selectedNodes, nodeId),
    selectedNodes: (state) => {
        let nodeObjects = [];
        Object.keys(state.selectedNodes).forEach((node) => {
            nodeObjects.push(state.selectedNodes[node]);
        });
        return nodeObjects;
    },
    selectedConnectionIds: (state) => Object.values(state.selectedConnections),
    selectedConnections: (state) => {
        let connectionObjects = [];
        Object.keys(state.selectedConnections).forEach((connection) => {
            connectionObjects.push(state.selectedConnections[connection]);
        });
        return connectionObjects;
    },
    isConnectionSelected: (state) => (connectionId) => Reflect.has(state.selectedConnections, connectionId)
};
