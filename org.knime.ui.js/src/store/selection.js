/**
 * Store that holds selected objects (nodes, connections)
 */

// WARNING: Do not use this state directly. Use getters that filter non existent workflow objects.
export const state = () => ({
    /**
     * Selected nodes object. If key exists it means it is selected.
     * @type {Object.<string, boolean>}
     */
    selectedNodes: {},
    /**
     * @type {Object.<string, boolean>}
     */
    selectedConnections: {},
    /**
     * @type {Object.<string, boolean>}
     */
    selectedAnnotations: {}
});

export const mutations = {

    // Add nodeIds to selection
    addNodesToSelection(state, nodeIds) {
        // Work on a copy of the state. The vue reactivity-machinery only runs once afterwards
        let selectedNodes = { ...state.selectedNodes };
        nodeIds.forEach(id => {
            selectedNodes[id] = true;
        });

        state.selectedNodes = selectedNodes;
    },

    // Removes each node of the provided nodeIds array from the selected nodes
    removeNodesFromSelection(state, nodeIds) {
        // Work on a copy of the state. The vue reactivity-machinery only runs once afterwards
        let selectedNodes = { ...state.selectedNodes };
        nodeIds.forEach(id => {
            delete selectedNodes[id];
        });

        state.selectedNodes = selectedNodes;
    },

    // Clear the selected nodes and the selected connections at once
    clearSelection(state) {
        // dont override selectedNodes/Connections-object, in case there is nothing selected
        // prevents unnecessary slowdown.
        if (Object.keys(state.selectedNodes).length > 0) {
            state.selectedNodes = {};
        }
        if (Object.keys(state.selectedConnections).length > 0) {
            state.selectedConnections = {};
        }
        if (Object.keys(state.selectedAnnotations).length > 0) {
            state.selectedAnnotations = {};
        }
    },

    //  Add connectionIds to selection.
    addConnectionsToSelection(state, connectionIds) {
        connectionIds.forEach(id => {
            state.selectedConnections[id] = true;
        });
    },

    // Removes each connection of the provided connections object to the selected connection object.
    removeConnectionsFromSelection(state, connectionIds) {
        connectionIds.forEach(id => {
            delete state.selectedConnections[id];
        });
    },

    //  Add annotationIds to selection.
    addAnnotationToSelection(state, annotationIds) {
        annotationIds.forEach(id => {
            state.selectedAnnotations[id] = true;
        });
    },

    // Removes each annotation of the provided annotation object to the selected annotation object.
    removeAnnotationFromSelection(state, annotationIds) {
        annotationIds.forEach(id => {
            delete state.selectedAnnotations[id];
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
    },

    selectAnnotation({ commit }, annotationId) {
        commit('addAnnotationToSelection', [annotationId]);
    },

    selectAnnotations({ commit }, annotationIds) {
        commit('addAnnotationToSelection', annotationIds);
    },

    deselectAnnotation({ commit }, annotationId) {
        commit('removeAnnotationFromSelection', [annotationId]);
    },

    deselectAnnotations({ commit }, annotationId) {
        commit('removeAnnotationFromSelection', annotationId);
    }
};

export const getters = {
    // Returns an array of selected node objects.
    // This getter filters non-existent selected nodes
    selectedNodes(state, getters, rootState) {
        if (!rootState.workflow.activeWorkflow) {
            return [];
        }
        return Object.keys(state.selectedNodes)
            .map((nodeId) => rootState.workflow.activeWorkflow.nodes[nodeId])
            .filter(Boolean);
    },

    selectedAnnotations(state, getters, rootState) {
        if (!rootState.workflow.activeWorkflow) {
            return [];
        }
        return rootState.workflow.activeWorkflow.workflowAnnotations
            .filter(annotation => Object.keys(state.selectedAnnotations).includes(annotation.id));
    },

    // Returns an array of all selected node ids.
    selectedNodeIds(state, { selectedNodes }) {
        return selectedNodes.map(node => node.id);
    },

    selectedAnnotationIds(state, { selectedAnnotations }) {
        return selectedAnnotations.map(annotation => annotation.id);
    },

    // Returns null if none or multiple nodes are selected, otherwise returns the selected node
    singleSelectedNode(state, { selectedNodes }) {
        if (selectedNodes.length !== 1) {
            return null;
        }
        return selectedNodes[0];
    },

    // Checks if a given node id is present in the selected object.
    isNodeSelected: (state) => (nodeId) => nodeId in state.selectedNodes,

    // Checks if a given annotation id is present in the selected object.
    isAnnotationSelected: (state) => (annotationId) => annotationId in state.selectedAnnotations,

    // Returns an array of selected connection objects.
    selectedConnections(state, getters, { workflow: { activeWorkflow } }) {
        if (!activeWorkflow) {
            return [];
        }

        return Object.keys(state.selectedConnections)
            .map(id => activeWorkflow.connections[id])
            .filter(Boolean); // after deleting a selected connection, it will be undefined
    },

    // Checks if a given connection id is present in the selected object.
    isConnectionSelected: (state) => (connectionId) => Reflect.has(state.selectedConnections, connectionId),

    isSelectionEmpty(_, getters) {
        return getters.selectedNodeIds.length === 0 && getters.selectedConnections.length === 0;
    }
};
