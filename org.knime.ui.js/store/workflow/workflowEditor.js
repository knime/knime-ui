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
    undo({ state }) {
        undo({ projectId: state.activeWorkflow.projectId, workflowId: state.activeWorkflow.info.containerId });
    },
    /* See docs in API */
    redo({ state }) {
        redo({ projectId: state.activeWorkflow.projectId, workflowId: state.activeWorkflow.info.containerId });
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
    async moveObjects({ state, commit, rootGetters }, { projectId }) {
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
                workflowId: state.activeWorkflow.info.containerId,
                nodeIds: selectedNodes,
                translation,
                annotationIds: []
            });
        } catch (e) {
            consola.log('The following error occured: ', e);
            commit('resetMovePreview');
        }
    },

    async connectNodes({ state }, { sourceNode, destNode, sourcePort, destPort }) {
        await connectNodes({
            projectId: state.activeWorkflow.projectId,
            workflowId: state.activeWorkflow.info.containerId,
            sourceNode,
            sourcePort,
            destNode,
            destPort
        });
    },
    async addNode({ state }, { position: [x, y], nodeFactory }) {
        await addNode({
            projectId: state.activeWorkflow.projectId,
            workflowId: state.activeWorkflow.info.containerId,
            position: { x, y },
            nodeFactory
        });
    },
    async collapseToContainer({ state, rootGetters, dispatch }, { containerType }) {
        const selectedNodes = rootGetters['selection/selectedNodeIds'];
    
        if (rootGetters['selection/selectedNodes'].some(node => node.allowedActions.canCollapse === 'resetRequired')) {
            if (!window.confirm(`Creating this ${containerType} will reset executed nodes.`)) {
                return;
            }
        }
    
        // 1. deselect all objects
        dispatch('selection/deselectAllObjects', null, { root: true });
    
        // 2. send request
        const { newNodeId } = await collapseToContainer({
            containerType,
            projectId: state.activeWorkflow.projectId,
            workflowId: state.activeWorkflow.info.containerId,
            nodeIds: selectedNodes,
            annotationIds: []
        });

        // 3. select new container node, if user hasn't selected something else in the meantime
        if (rootGetters['selection/isSelectionEmpty']) {
            dispatch('selection/selectNode', newNodeId, { root: true });
            dispatch('openNameEditor', newNodeId);
        }
    },
    async expandContainerNode({ state, rootGetters, dispatch }) {
        const selectedNode = rootGetters['selection/singleSelectedNode'];
            
        if (selectedNode.allowedActions.canExpand === 'resetRequired') {
            if (!window.confirm(`Expanding this ${selectedNode.kind} will reset executed nodes.`)) {
                return;
            }
        }
        // 1. deselect all objects
        dispatch('selection/deselectAllObjects', null, { root: true });
    
        // 2. send request
        const { expandedNodeIds } = await expandContainerNode({
            projectId: state.activeWorkflow.projectId,
            workflowId: state.activeWorkflow.info.containerId,
            nodeId: selectedNode.id
        });

        // 3. select expanded nodes, if user hasn't selected something else in the meantime
        if (rootGetters['selection/isSelectionEmpty']) {
            dispatch('selection/selectNodes', expandedNodeIds, { root: true });
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
        state: { activeWorkflow: { info: { containerId } } },
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
                workflowId: containerId,
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
    renameContainerNode({ state }, { nodeId, name }) {
        const { activeWorkflow: { projectId } } = state;
        const { activeWorkflow: { info: { containerId } } } = state;
        renameContainerNode({
            nodeId,
            name,
            projectId,
            workflowId: containerId
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
        const { activeWorkflow: { info: { containerId } } } = state;
    
        addContainerNodePort({ projectId, workflowId: containerId, nodeId, side, typeId });
    },

    removeContainerNodePort({ state, getters }, { nodeId, side, typeId, portIndex }) {
        let { activeWorkflow: { projectId } } = state;
        const { activeWorkflow: { info: { containerId } } } = state;
    
        removeContainerNodePort({ projectId, workflowId: containerId, nodeId, side, typeId, portIndex });
    },

    async copyOrCutWorkflowParts({ state, rootGetters, dispatch }, { command }) {
        if (!['copy', 'cut'].includes(command)) {
            throw new Error("command has to be 'copy' or 'cut'");
        }

        const selectedNodes = rootGetters['selection/selectedNodeIds'];
        const selectedAnnotations = []; // Annotations cannot be selected yet
        if (command === 'cut') {
            dispatch('selection/deselectAllObjects', null, { root: true });
        }
        const response = await copyOrCutWorkflowParts({
            projectId: state.activeWorkflow.projectId,
            workflowId: state.activeWorkflow.info.containerId,
            command,
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
                workflowId: state.activeWorkflow.info.containerId,
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
