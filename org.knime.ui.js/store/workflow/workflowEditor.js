import { deleteObjects, moveObjects, undo, redo, connectNodes, addNode, renameContainerNode, collapseToContainer,
    addContainerNodePort, expandContainerNode } from '~api';

/**
 * This store is not instantiated by Nuxt but merged with the workflow store.
 * It handles shared state regarding editing.
 */

export const state = {
    isDragging: false,
    deltaMovePosition: { x: 0, y: 0 },
    nameEditorNodeId: null
};

export const mutations = {
    // Shifts the position of the node for the provided amount
    setMovePreview(state, { deltaX, deltaY }) {
        state.deltaMovePosition.x = deltaX;
        state.deltaMovePosition.y = deltaY;
    },
    // Reset the position of the outline
    // TODO: rename accordingly, or merge with above method
    resetMovePreview(state) {
        state.deltaMovePosition = { x: 0, y: 0 };
    },
    // change the isDragging property to the provided Value
    setDragging(state, { isDragging }) {
        state.isDragging = isDragging;
    },
    setNameEditorNodeId(state, nodeId) {
        state.nameEditorNodeId = nodeId;
    }
};

export const actions = {
    /* See docs in API */
    undo({ state, getters }) {
        let { activeWorkflowId } = getters;
        undo({ projectId: state.activeWorkflow.projectId, workflowId: activeWorkflowId });
    },
    /* See docs in API */
    redo({ state, getters }) {
        let { activeWorkflowId } = getters;
        redo({ projectId: state.activeWorkflow.projectId, workflowId: activeWorkflowId });
    },

    /**
     * Calls the API to save the position of the nodes after the move is over
     * @param {Object} context - store context
     * @param {Object} params
     * @param {string} params.projectId - id of the project
     * @param {string} params.nodeId - id of the node
     * @param {Object} params.startPos - start position {x: , y: } of the move event
     * @returns {void} - nothing to return
     */
    async moveObjects({ state, getters, commit, rootGetters }, { projectId }) {
        let translation;
        let selectedNodes = rootGetters['selection/selectedNodeIds'];
        // calculate the translation either relative to the position or the outline position
        translation = {
            x: state.deltaMovePosition.x,
            y: state.deltaMovePosition.y
        };
        try {
            await moveObjects({
                projectId,
                workflowId: getters.activeWorkflowId,
                nodeIds: selectedNodes,
                translation,
                annotationIds: []
            });
        } catch (e) {
            consola.log('The following error occured: ', e);
            commit('resetMovePreview');
        }
    },

    async connectNodes({ state, getters }, { sourceNode, destNode, sourcePort, destPort }) {
        await connectNodes({
            projectId: state.activeWorkflow.projectId,
            workflowId: getters.activeWorkflowId,
            sourceNode,
            sourcePort,
            destNode,
            destPort
        });
    },
    async addNode({ state, getters }, { position, nodeFactory }) {
        await addNode({
            projectId: state.activeWorkflow.projectId,
            workflowId: getters.activeWorkflowId,
            position: {
                x: position[0],
                y: position[1]
            },
            nodeFactory
        });
    },
    async collapseToContainer({ state, getters, rootGetters, dispatch }, { containerType }) {
        const selectedNodes = rootGetters['selection/selectedNodeIds'];
        let canCollapse = true;
    
        if (rootGetters['selection/selectedNodes'].some(node => node.allowedActions.canCollapse === 'resetRequired')) {
            canCollapse = window.confirm(`Creating this ${containerType} will reset the executed nodes.`);
        }
    
        if (canCollapse) {
            dispatch('selection/deselectAllObjects', null, { root: true });
    
            await collapseToContainer({
                containerType,
                projectId: state.activeWorkflow.projectId,
                workflowId: getters.activeWorkflowId,
                nodeIds: selectedNodes,
                annotationIds: []
            });
        }
    },
    async expandContainerNode({ state, getters, rootGetters, dispatch }) {
        const selectedNode = rootGetters['selection/singleSelectedNode'];
            
        let shouldExpand = true;
        if (selectedNode.allowedActions.canExpand === 'resetRequired') {
            shouldExpand = window.confirm(`Expanding this ${selectedNode.kind} will reset the executed nodes.`);
        }
    
        if (shouldExpand) {
            dispatch('selection/deselectAllObjects', null, { root: true });
    
            await expandContainerNode({
                projectId: state.activeWorkflow.projectId,
                workflowId: getters.activeWorkflowId,
                nodeId: selectedNode.id
            });
        }
    },
        
    /**
     * Deletes all selected objects and displays an error message for the objects, that cannot be deleted.
     * If the objects can be deleted a deselect event is fired.
     * @param {Object} context - store context
     * @returns {void} - nothing to return
     */
    deleteSelectedObjects({
        state: { activeWorkflow },
        getters: { activeWorkflowId },
        rootState,
        rootGetters,
        dispatch
    }) {
        const selectedNodes = rootGetters['selection/selectedNodes'];
        const selectedConnections = rootGetters['selection/selectedConnections'];
        const deletableNodeIds = selectedNodes.filter(node => node.allowedActions.canDelete).map(node => node.id);
        const nonDeletableNodeIds = selectedNodes.filter(node => !node.allowedActions.canDelete).map(node => node.id);
        const deletableConnectionIds = selectedConnections.filter(
            connection => connection.allowedActions.canDelete
        ).map(connection => connection.id);
        const nonDeletableConnectionIds = selectedConnections.filter(
            connection => !connection.allowedActions.canDelete
        ).map(connection => connection.id);

        if (deletableNodeIds.length || deletableConnectionIds.length) {
            deleteObjects({
                projectId: activeWorkflow.projectId,
                workflowId: activeWorkflowId,
                nodeIds: deletableNodeIds.length ? deletableNodeIds : [],
                connectionIds: deletableConnectionIds ? deletableConnectionIds : []
            });
            dispatch('selection/deselectAllObjects', null, { root: true });
        }

        let messages = [];
        if (nonDeletableNodeIds.length) {
            messages.push(`The following nodes can’t be deleted: [${nonDeletableNodeIds.join(', ')}]`);
        }
        if (nonDeletableConnectionIds.length) {
            messages.push(`The following connections can’t be deleted: [${nonDeletableConnectionIds.join(', ')}]`);
        }
        if (messages.length) {
            window.alert(messages.join(' \n'));
        }
    },

    /**
     * Renames a container (metanode or component).
     * @param {Object} context - store context
     * @param {string} params.nodeId - container node id
     * @param {string} params.name - new new
     * @returns {void} - nothing to return
     */
    renameContainerNode({ state, getters }, { nodeId, name }) {
        const { activeWorkflow: { projectId } } = state;
        const { activeWorkflowId } = getters;
        renameContainerNode({
            nodeId,
            name,
            projectId,
            workflowId: activeWorkflowId
        });
    },
    openNameEditor({ commit }, nodeId) {
        commit('setNameEditorNodeId', nodeId);
    },
    closeNameEditor({ commit }) {
        commit('setNameEditorNodeId', null);
    },

    addContainerNodePort({ state, getters }, { nodeId, side, typeId }) {
        let { activeWorkflow: { projectId } } = state;
        let { activeWorkflowId: workflowId } = getters;
    
        addContainerNodePort({ projectId, workflowId, nodeId, side, typeId });
    }
};

export const getters = { };
