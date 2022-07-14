import { deleteObjects, moveObjects, undo, redo, connectNodes, addNode, renameContainerNode, collapseToContainer,
    addContainerNodePort, expandContainerNode, removeContainerNodePort, copyOrCutWorkflowParts,
    pasteWorkflowParts } from '~api';

/**
 * This store is not instantiated by Nuxt but merged with the workflow store.
 * It handles shared state regarding editing.
 */

export const state = {
    movePreviewDelta: { x: 0, y: 0 },
    nameEditorNodeId: null
};

export const mutations = {
    // Shifts the position of the node for the provided amount
    setMovePreview(state, { deltaX, deltaY }) {
        state.movePreviewDelta.x = deltaX;
        state.movePreviewDelta.y = deltaY;
    },
    // Reset the position of the outline
    resetMovePreview(state) {
        state.movePreviewDelta = { x: 0, y: 0 };
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
            x: state.movePreviewDelta.x,
            y: state.movePreviewDelta.y
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
            canCollapse = window.confirm(`Creating this ${containerType} will reset executed nodes.`);
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
            shouldExpand = window.confirm(`Expanding this ${selectedNode.kind} will reset executed nodes.`);
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
    },

    removeContainerNodePort({ state, getters }, { nodeId, side, typeId, portIndex }) {
        let { activeWorkflow: { projectId } } = state;
        let { activeWorkflowId: workflowId } = getters;
    
        removeContainerNodePort({ projectId, workflowId, nodeId, side, typeId, portIndex });
    },

    async copyOrCutWorkflowParts({ state, getters, rootGetters, dispatch }, { methodType }) {
        const selectedNodes = rootGetters['selection/selectedNodeIds'];
        const selectedAnnotations = []; // Annotations cannot be selected yet
        if (methodType === 'cut') {
            dispatch('selection/deselectAllObjects', null, { root: true });
        }
        const response = await copyOrCutWorkflowParts({
            projectId: state.activeWorkflow.projectId,
            workflowId: getters.activeWorkflowId,
            command: methodType,
            nodeIds: selectedNodes,
            annotationIds: selectedAnnotations
        });
        const clipboardContent = JSON.parse(response.content);
        consola.info('Copied workflow parts', clipboardContent);
        try {
            navigator.clipboard.writeText(JSON.stringify(clipboardContent));
        } catch (error) {
            consola.info('Could not write to clipboard. Maybe the user did not permit it?');
        }
    },
    
    async pasteWorkflowParts({ state, getters }) {
        try {
            // TODO: NXT-1168 Put a limit on the clipboard content size
            const clipboardContent = await navigator.clipboard.readText();
            const verifiedContent = JSON.parse(clipboardContent);
            consola.info('Pasted workflow parts', verifiedContent);
            // TODO: NXT-1153 Set the `position` parameter here to handle special cases
            pasteWorkflowParts({
                projectId: state.activeWorkflow.projectId,
                workflowId: getters.activeWorkflowId,
                content: JSON.stringify(verifiedContent),
                position: getters.isWorkflowEmpty ? { x: 0, y: 0 } : null
            });
        } catch (error) {
            consola.info('Could not read form clipboard. Maybe the user did not permit it?');
        }
    }
};

export const getters = {
    isDragging({ movePreviewDelta }) {
        return movePreviewDelta.x !== 0 || movePreviewDelta.y !== 0;
    }
};
