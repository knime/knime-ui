import { API } from '@api';
import workflowObjectBounds from '@/util/workflowObjectBounds';
import { pastePartsAt, pasteURI } from '@/util/pasteToWorkflow';
import { snapToGrid } from '@/util/geometry';

/**
 * This store is not instantiated by Nuxt but merged with the workflow store.
 * It handles shared state regarding editing.
 */

export const state = {
    movePreviewDelta: { x: 0, y: 0 },
    nameEditorNodeId: null,
    labelEditorNodeId: null,
    copyPaste: null,
    hasAbortedNodeDrag: false,
    portTypeMenu: {
        isOpen: false,
        nodeId: null,
        startNodeId: null,
        previewPort: null,
        props: {},
        events: {}
    },
    quickAddNodeMenu: {
        isOpen: false,
        nodeId: null,
        props: {},
        events: {}
    },
    isDragging: false
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
    },

    setLabelEditorNodeId(state, nodeId) {
        state.labelEditorNodeId = nodeId;
    },

    setCopyPaste(state, copyPasteState) {
        state.copyPaste = copyPasteState;
    },
    setLastPasteBounds(state, bounds) {
        if (!state.copyPaste) {
            state.copyPaste = {};
        }

        state.copyPaste.lastPasteBounds = bounds;
    },

    setHasAbortedNodeDrag(state, value) {
        state.hasAbortedNodeDrag = value;
    },

    setPortTypeMenu(state, value) {
        state.portTypeMenu = value;
    },

    setQuickAddNodeMenu(state, value) {
        state.quickAddNodeMenu = value;
    },

    setPortTypeMenuPreviewPort(state, previewPort) {
        state.portTypeMenu = { ...state.portTypeMenu, previewPort };
    },

    setIsDragging(state, value) {
        state.isDragging = value;
    }
};

/* automatically includes projectId and workflowId */
export const wrapAPI = (apiCall) =>
// eslint-disable-next-line semi, implicit-arrow-linebreak
    function ({ state: { activeWorkflow } }, apiArgs = {}) {
        const projectId = activeWorkflow.projectId;
        const workflowId = activeWorkflow.info.containerId;

        return apiCall({ projectId, workflowId, ...apiArgs });
    };

// const withBaseParams = <T extends keyof typeof API.workflowCommand>(command: T) => {
//     // eslint-disable-next-line func-style
//     function wrapped({ state: { activeWorkflow } }, apiArgs = {}) {
//         const projectId = activeWorkflow.projectId;
//         const workflowId = activeWorkflow.info.containerId;

//         return command({ projectId, workflowId, ...apiArgs });
//     }

//     return wrapped;
// };

export const actions = {
    openNameEditor({ commit }, nodeId) {
        commit('setNameEditorNodeId', nodeId);
    },
    closeNameEditor({ commit }) {
        commit('setNameEditorNodeId', null);
    },
    openLabelEditor({ commit }, nodeId) {
        commit('setLabelEditorNodeId', nodeId);
    },
    closeLabelEditor({ commit }) {
        commit('setLabelEditorNodeId', null);
    },

    openPortTypeMenu({ commit }, { nodeId, startNodeId, props, events }) {
        commit('setPortTypeMenu', {
            isOpen: true,
            previewPort: null,
            nodeId,
            startNodeId,
            props,
            events
        });
    },
    closePortTypeMenu({ commit }) {
        commit('setPortTypeMenu', {
            isOpen: false,
            nodeId: null,
            previewPort: null,
            props: {},
            events: {}
        });
    },

    openQuickAddNodeMenu({ commit }, { props, events }) {
        commit('setQuickAddNodeMenu', {
            isOpen: true,
            props,
            events
        });
    },
    closeQuickAddNodeMenu({ commit }) {
        commit('setQuickAddNodeMenu', {
            isOpen: false,
            props: {},
            events: {}
        });
    },

    undo({ state: { activeWorkflow } }) {
        const projectId = activeWorkflow.projectId;
        const workflowId = activeWorkflow.info.containerId;
        return API.workflow.undoWorkflowCommand({ projectId, workflowId });
    },
    redo({ state: { activeWorkflow } }) {
        const projectId = activeWorkflow.projectId;
        const workflowId = activeWorkflow.info.containerId;
        return API.workflow.redoWorkflowCommand({ projectId, workflowId });
    },
    connectNodes(
        { state: { activeWorkflow } },
        { sourceNode, sourcePort, destNode, destPort }
    ) {
        const projectId = activeWorkflow.projectId;
        const workflowId = activeWorkflow.info.containerId;
        return API.workflowCommand.Connect({
            projectId,
            workflowId,
            sourceNodeId: sourceNode,
            sourcePortIdx: sourcePort,
            destinationNodeId: destNode,
            destinationPortIdx: destPort
        });
    },
    addNodePort(
        { state: { activeWorkflow } },
        { nodeId, side, portGroup, typeId }
    ) {
        const projectId = activeWorkflow.projectId;
        const workflowId = activeWorkflow.info.containerId;

        return API.workflowCommand.AddPort({
            projectId,
            workflowId,
            nodeId,
            side,
            portGroup,
            portTypeId: typeId
        });
    },
    removeNodePort(
        { state: { activeWorkflow } },
        { nodeId, side, index, portGroup }
    ) {
        const projectId = activeWorkflow.projectId;
        const workflowId = activeWorkflow.info.containerId;

        return API.workflowCommand.RemovePort({
            projectId,
            workflowId,
            nodeId,
            side,
            portGroup,
            portIndex: index
        });
    },
    renameContainerNode({ state: { activeWorkflow } }, { nodeId, name }) {
        const projectId = activeWorkflow.projectId;
        const workflowId = activeWorkflow.info.containerId;

        return API.workflowCommand.UpdateComponentOrMetanodeName({
            projectId,
            workflowId,
            nodeId,
            name
        });
    },
    renameNodeLabel({ state: { activeWorkflow } }, { nodeId, label }) {
        const projectId = activeWorkflow.projectId;
        const workflowId = activeWorkflow.info.containerId;

        return API.workflowCommand.UpdateNodeLabel({
            projectId,
            workflowId,
            nodeId,
            label
        });
    },

    replaceNode({ state: { activeWorkflow } }, { nodeId, nodeFactory }) {
        const projectId = activeWorkflow.projectId;
        const workflowId = activeWorkflow.info.containerId;

        return API.workflowCommand.ReplaceNode({
            projectId,
            workflowId,
            nodeId,
            nodeFactory
        });
    },

    async addNode(
        { state, dispatch },
        {
            position,
            nodeFactory = null,
            spaceItemReference,
            // use either nodeFactory or spaceItemReference
            sourceNodeId = null,
            sourcePortIdx = null,
            // possible values are: 'new-only' | 'add' | 'none'
            // 'new-only' clears the active selection and selects only the new node
            // 'add' adds the new node to the active selection
            // 'none' doesn't modify the active selection nor it selects the new node
            selectionMode = 'new-only'
        }
    ) {
        const { activeWorkflow } = state;
        const { projectId } = activeWorkflow;
        const {
            info: { containerId: workflowId }
        } = activeWorkflow;

        // Adjusted For Grid Snapping
        const gridAdjustedPosition = {
            x: snapToGrid(position.x),
            y: snapToGrid(position.y)
        };

        const response = await API.workflowCommand.AddNode({
            projectId,
            workflowId,
            position: gridAdjustedPosition,
            nodeFactory,
            spaceItemReference,
            sourceNodeId,
            sourcePortIdx
        });

        if (selectionMode !== 'none') {
            if (selectionMode === 'new-only') {
                dispatch('selection/deselectAllObjects', null, { root: true });
            }

            dispatch('selection/selectNode', response.newNodeId, { root: true });
        }

        return response;
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
        const selectedNodes = rootGetters['selection/selectedNodeIds'];

        const translation = {
            x: state.movePreviewDelta.x,
            y: state.movePreviewDelta.y
        };

        try {
            await API.workflowCommand.Translate({
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

    async collapseToContainer(
        { state, rootGetters, dispatch },
        { containerType }
    ) {
        const {
            activeWorkflow: { projectId }
        } = state;
        const {
            activeWorkflow: {
                info: { containerId }
            }
        } = state;
        const selectedNodeIds = rootGetters['selection/selectedNodeIds'];
        const selectedNodes = rootGetters['selection/selectedNodes'];

        if (
            selectedNodes.some(
                (node) => node.allowedActions.canCollapse === 'resetRequired'
            )
        ) {
            if (
                !window.confirm(
                    `Creating this ${containerType} will reset executed nodes.`
                )
            ) {
                return;
            }
        }

        // 1. deselect all objects
        dispatch('selection/deselectAllObjects', null, { root: true });

        // 2. send request
        const { newNodeId } = await API.workflowCommand.Collapse({
            containerType,
            projectId,
            workflowId: containerId,
            nodeIds: selectedNodeIds,
            annotationIds: []
        });

        // 3. select new container node, if user hasn't selected something else in the meantime
        if (rootGetters['selection/isSelectionEmpty']) {
            dispatch('selection/selectNode', newNodeId, { root: true });
            dispatch('openNameEditor', newNodeId);
        }
    },

    async expandContainerNode({ state, rootGetters, dispatch }) {
        const {
            activeWorkflow: { projectId }
        } = state;
        const {
            activeWorkflow: {
                info: { containerId }
            }
        } = state;
        const selectedNode = rootGetters['selection/singleSelectedNode'];

        if (selectedNode.allowedActions.canExpand === 'resetRequired') {
            if (
                !window.confirm(
                    `Expanding this ${selectedNode.kind} will reset executed nodes.`
                )
            ) {
                return;
            }
        }
        // 1. deselect all objects
        dispatch('selection/deselectAllObjects', null, { root: true });

        // 2. send request
        const { expandedNodeIds } = await API.workflowCommand.Expand({
            projectId,
            workflowId: containerId,
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
    deleteSelectedObjects({ state, rootGetters, dispatch }) {
        const { activeWorkflow: { projectId } } = state;
        const { activeWorkflow: { info: { containerId } } } = state;
        const selectedNodes = rootGetters['selection/selectedNodes'];
        const selectedConnections = rootGetters['selection/selectedConnections'];
        const selectedAnnotationIds = rootGetters['selection/selectedAnnotationIds'];
        const deletableNodeIds = selectedNodes
            .filter((node) => node.allowedActions.canDelete)
            .map((node) => node.id);

        const nonDeletableNodeIds = selectedNodes
            .filter((node) => !node.allowedActions.canDelete)
            .map((node) => node.id);

        const deletableConnectionIds = selectedConnections
            .filter((connection) => connection.allowedActions.canDelete)
            .map((connection) => connection.id);

        const nonDeletableConnectionIds = selectedConnections
            .filter((connection) => !connection.allowedActions.canDelete)
            .map((connection) => connection.id);

        if (deletableNodeIds.length || deletableConnectionIds.length || selectedAnnotationIds.length) {
            API.workflowCommand.Delete({
                projectId,
                workflowId: containerId,
                nodeIds: deletableNodeIds.length ? deletableNodeIds : [],
                connectionIds: deletableConnectionIds.length ? deletableConnectionIds : [],
                annotationIds: selectedAnnotationIds.length ? selectedAnnotationIds : []
            });
            dispatch('selection/deselectAllObjects', null, { root: true });
        }

        const messages = [];
        if (nonDeletableNodeIds.length) {
            messages.push(
                `The following nodes can’t be deleted: [${nonDeletableNodeIds.join(
                    ', '
                )}]`
            );
        }
        if (nonDeletableConnectionIds.length) {
            messages.push(
                `The following connections can’t be deleted: [${nonDeletableConnectionIds.join(
                    ', '
                )}]`
            );
        }
        if (messages.length) {
            window.alert(messages.join(' \n'));
        }
    },

    async copyOrCutWorkflowParts(
        { state, rootGetters, dispatch, commit },
        { command }
    ) {
        if (!['copy', 'cut'].includes(command)) {
            throw new Error("command has to be 'copy' or 'cut'");
        }

        const {
            activeWorkflow: { projectId }
        } = state;
        const {
            activeWorkflow: {
                info: { containerId }
            }
        } = state;
        const selectedNodes = rootGetters['selection/selectedNodeIds'];
        const selectedAnnotations = []; // Annotations cannot be selected yet

        if (rootGetters['selection/isSelectionEmpty']) {
            return;
        }

        const objectBounds = workflowObjectBounds({
            nodes: rootGetters['selection/selectedNodes']
        });

        if (command === 'cut') {
            dispatch('selection/deselectAllObjects', null, { root: true });
        }

        const workflowCommand = command === 'copy'
            ? API.workflowCommand.Copy
            : API.workflowCommand.Cut;

        const response = await workflowCommand({
            projectId,
            workflowId: containerId,
            nodeIds: selectedNodes,
            annotationIds: selectedAnnotations
        });

        // @ts-ignore TODO: fix this
        const payload = JSON.parse(response.content);

        const clipboardContent = {
            payloadIdentifier: payload.payloadIdentifier,
            projectId,
            workflowId: containerId,
            // @ts-ignore TODO: fix this
            data: response.content,
            objectBounds
        };

        try {
            navigator.clipboard.writeText(JSON.stringify(clipboardContent));

            commit('setCopyPaste', {
                payloadIdentifier: clipboardContent.payloadIdentifier
            });

            consola.info('Copied workflow parts', clipboardContent);
        } catch (error) {
            consola.info('Could not write to clipboard.');
        }
    },

    async pasteWorkflowParts(
        {
            state: { activeWorkflow, copyPaste },
            getters: { isWorkflowEmpty },
            dispatch,
            rootGetters,
            commit
        },
        { position: customPosition } = { position: null }
    ) {
        let clipboardContent, clipboardText;
        try {
            // TODO: NXT-1168 Put a limit on the clipboard content size
            clipboardText = await navigator.clipboard.readText();
        } catch (e) {
            consola.info(
                'Could not read from clipboard. Maybe the user did not permit it?'
            );
            return;
        }

        try {
            clipboardContent = JSON.parse(clipboardText);
        } catch (e) {
            // try to paste the clipboard content as a URI
            if (
                !pasteURI(
                    clipboardText,
                    activeWorkflow,
                    customPosition,
                    rootGetters['canvas/getVisibleFrame']()
                )
            ) {
                consola.info('Could not parse json or URI from clipboard.');
            }
            return;
        }

        consola.info('Pasted workflow parts');

        // 1. Decide where to paste
        const { position, doAfterPaste } = customPosition
            ? { position: customPosition, doAfterPaste: null }
            : pastePartsAt({
                visibleFrame: rootGetters['canvas/getVisibleFrame'](),
                clipboardContent,
                isWorkflowEmpty,
                workflow: activeWorkflow,
                copyPaste,
                dispatch
            });

        // 2. Remember decision
        commit('setLastPasteBounds', {
            left: position.x,
            top: position.y,
            width: clipboardContent.objectBounds.width,
            height: clipboardContent.objectBounds.height
        });

        // 3. Do actual pasting
        const { nodeIds } = await API.workflowCommand.Paste({
            projectId: activeWorkflow.projectId,
            workflowId: activeWorkflow.info.containerId,
            content: clipboardContent.data,
            position
        });

        // 4. Execute hook and select pasted content
        doAfterPaste?.();
        dispatch('selection/deselectAllObjects', null, { root: true });
        dispatch('selection/selectNodes', nodeIds, { root: true });
    }
};

export const getters = {
};
