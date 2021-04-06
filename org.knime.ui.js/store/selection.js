/**
 * 
 */
export const state = () => ({
    selectedNodes: [],
    selectedConnections: []
});

export const mutations = {
    deselectAllNodes(state) {
        state.selectedNodes = [];
    },
    selectAllNodes(state, nodes) {
        Object.values(nodes).forEach(node => {
            state.selectedNodes.push(node);
        });
    },
    selectNode(state, node) {
        state.selectedNodes.push(node);
    },
    deselectNode(state, nodeId) {
        state.selectedNodes = state.selectedNodes.filter((node) => node.id !== nodeId);
    },
    selectConnector(state, connector) {
        state.selectedConnections.push(connector);
    },
    deselectConnector(state, connectorId) {
        state.selectedConnections = state.selectedNodes.filter((connector) => connector.id !== connectorId);
    },
    deselectAllConnectors(state) {
        state.selectedConnections = [];
    }
};

export const getters = {
    selectedNodes: (state) => state.selectedNodes,
    selectedConnections: (state) => state.selectedConnections
};
