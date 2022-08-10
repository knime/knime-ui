import { deleteObjects, moveObjects, undo, redo, connectNodes, addNode, renameContainerNode, collapseToContainer,
    addNodePort, removeNodePort, expandContainerNode, copyOrCutWorkflowParts, pasteWorkflowParts } from '~api';
import workflowObjectBounds from '~/util/workflowObjectBounds';
import { areaCoverage } from '~/util/geometry';
import { findFreeSpace } from '~/util/findFreeSpaceOnCanvas';

/**
 * This store is not instantiated by Nuxt but merged with the workflow store.
 * It handles shared state regarding editing.
 */

export const state = {
    movePreviewDelta: { x: 0, y: 0 },
    nameEditorNodeId: null,
    copyPaste: null
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

    setCopyPaste(state, payloadIdentifier) {
        state.copyPaste = payloadIdentifier;
    },
    setLastPasteBounds(state, bounds) {
        if (!state.copyPaste) {
            state.copyPaste = {};
        }

        state.copyPaste.lastPasteBounds = bounds;
    }
};

/* automatically includes projectId and workflowId */
export const wrapAPI = (apiCall) =>
    // eslint-disable-next-line semi, implicit-arrow-linebreak
    function ({ state: { activeWorkflow } }, apiArgs = {}) {
        let projectId = activeWorkflow.projectId;
        let workflowId = activeWorkflow.info.containerId;

        return apiCall({ projectId, workflowId, ...apiArgs });
    };

export const actions = {
    openNameEditor({ commit }, nodeId) {
        commit('setNameEditorNodeId', nodeId);
    },
    closeNameEditor({ commit }) {
        commit('setNameEditorNodeId', null);
    },

    /* See docs in API */
    undo:
        wrapAPI(undo),
    redo:
        wrapAPI(redo),
    connectNodes:
        wrapAPI(connectNodes),
    addNode:
        wrapAPI(addNode),
    addNodePort:
        wrapAPI(addNodePort),
    removeNodePort:
        wrapAPI(removeNodePort),
    renameContainerNode:
        wrapAPI(renameContainerNode),

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
        const selectedNodes = rootGetters['selection/selectedNodeIds'];
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

    async collapseToContainer({ state, rootGetters, dispatch }, { containerType }) {
        const { activeWorkflow: { projectId } } = state;
        const { activeWorkflow: { info: { containerId } } } = state;
        const selectedNodeIds = rootGetters['selection/selectedNodeIds'];
        const selectedNodes = rootGetters['selection/selectedNodes'];
    
        if (selectedNodes.some(node => node.allowedActions.canCollapse === 'resetRequired')) {
            if (!window.confirm(`Creating this ${containerType} will reset executed nodes.`)) {
                return;
            }
        }
    
        // 1. deselect all objects
        dispatch('selection/deselectAllObjects', null, { root: true });
    
        // 2. send request
        const { newNodeId } = await collapseToContainer({
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
        const { activeWorkflow: { projectId } } = state;
        const { activeWorkflow: { info: { containerId } } } = state;
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
                projectId,
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

    async copyOrCutWorkflowParts({ state, rootGetters, dispatch, commit }, { command }) {
        if (!['copy', 'cut'].includes(command)) {
            throw new Error("command has to be 'copy' or 'cut'");
        }

        const { activeWorkflow: { projectId } } = state;
        const { activeWorkflow: { info: { containerId } } } = state;
        const selectedNodes = rootGetters['selection/selectedNodeIds'];
        const selectedAnnotations = []; // Annotations cannot be selected yet
        
        if (rootGetters['selection/isSelectionEmpty']) {
            return;
        }
        
        let objectBounds = workflowObjectBounds({ nodes: rootGetters['selection/selectedNodes'] });

        if (command === 'cut') {
            dispatch('selection/deselectAllObjects', null, { root: true });
        }
        
        const response = await copyOrCutWorkflowParts({
            projectId,
            workflowId: containerId,
            command,
            nodeIds: selectedNodes,
            annotationIds: selectedAnnotations
        });
        const payload = JSON.parse(response.content);

        const clipboardContent = {
            payloadIdentifier: payload.payloadIdentifier,
            projectId,
            workflowId: containerId,
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
    
    async pasteWorkflowParts({
        state: { activeWorkflow: { projectId, info: { containerId }, nodes }, copyPaste },
        getters: { isWorkflowEmpty },
        dispatch, rootGetters, commit, rootState
    }) {
        let clipboardContent;
        try {
            // TODO: NXT-1168 Put a limit on the clipboard content size
            const clipboardText = await navigator.clipboard.readText();
            clipboardContent = JSON.parse(clipboardText);
            consola.info('Pasted workflow parts');
        } catch (e) {
            consola.info('Could not read form clipboard. Maybe the user did not permit it?');
            return;
        }

        // Area the user can see, in workflow coordinates
        const visibilityThreshold = 0.7;
        let visibleFrame = rootGetters['canvas/getVisibleFrame']();
        const isAreaVisible = (area) => areaCoverage(area, visibleFrame) < visibilityThreshold;

        /**
         * find free space for clipboard objects
         * @param { Number } position.left x position to start looking from
         * @param { Number } position.left y position to start looking from
         * @returns { Object } free space position and visibility of the area, if pasted there
         */
        const findFreeSpaceFrom = ({ left, top }) => {
            let position = findFreeSpace({ // eslint-disable-line implicit-arrow-linebreak
                area: clipboardContent.objectBounds,
                workflow: { nodes },
                startPosition: {
                    x: left,
                    y: top
                },
                step: {
                    x: 120,
                    y: 120
                }
            });
            
            let visibility = areaCoverage({
                left: position.x,
                top: position.y,
                width: clipboardContent.objectBounds.width,
                height: clipboardContent.objectBounds.height
            }, visibleFrame);

            return {
                ...position,
                visibility
            };
        };


        /**
         * Tries to fit clipboard objects beginning at the screen's center
         * If no free space is found within the canvas's border, it will be pasted directly at center
         * @returns { Object } x and y position
         */
        const centerStrategy = () => {
            const centerX = (visibleFrame.left + visibleFrame.width / 2) -
                (clipboardContent.objectBounds.width / 2);
            
            const eyePleasingVerticalOffset = 0.75;
            const centerY = visibleFrame.top + (visibleFrame.height / 2 * eyePleasingVerticalOffset) -
                (clipboardContent.objectBounds.height / 2);

            let fromCenter = findFreeSpaceFrom({
                left: centerX,
                top: centerY,
                width: clipboardContent.objectBounds.width,
                height: clipboardContent.objectBounds.height
            });

            if (fromCenter.visibility >= visibilityThreshold) {
                consola.info('found free space around center');
                return fromCenter;
            }

            consola.info('no free space found around center');
            return {
                x: centerX,
                y: centerY
            };
        };

        /**
         * Tries to fit clipboard objects beginning at it's original position
         * If no free space is found within the canvas' borders, it returns null
         * @returns { Object | null } x and y position
         */
        const originStrategy = () => {
            let fromOrigin = findFreeSpaceFrom(clipboardContent.objectBounds);

            if (fromOrigin.visibility >= visibilityThreshold) {
                consola.info('found free space with shift strategy');
                return fromOrigin;
            }
            consola.info('no free space found with shift strategy');
            return null;
        };


        /* The paste position depends on the
         * - origin of copied content
         * - visible area of the workflow,
         * - visibility of the copied objects
         * - visibility of the same objects pasted the last time
        */
        let position;
        let doAfterPaste = () => {};

        /* eslint-disable brace-style */
        if (isWorkflowEmpty) {
            consola.info('workflow is empty: paste to center');
            position = centerStrategy();
            doAfterPaste = () => {
                dispatch('canvas/fitToScreen', null, { root: true });
            };
        }

        /* Content has been pasted before */
        else if (
            copyPaste?.lastPasteBounds && isAreaVisible(copyPaste.lastPasteBounds)
        ) {
            consola.info('paste again, last paste not visible anymore: paste to center');
            position = centerStrategy();
        } else if (copyPaste?.lastPasteBounds) {
            consola.info('paste again, last paste visible: paste shifted');
            position = originStrategy() || centerStrategy();
        }

        /* Content comes from another application or workflow and is pasted for the first time */
        else if (!copyPaste || copyPaste.payloadIdentifier !== clipboardContent.payloadIdentifier) {
            consola.info('content comes from another application: paste to center');
            position = centerStrategy();
        } else if (clipboardContent.workflowId !== containerId || clipboardContent.projectId !== projectId) {
            consola.info('content comes from another workflow: paste to center');
            position = centerStrategy();
        }
        
        /* Content comes from this application and workflow and is pasted for the first time */
        else if (isAreaVisible(clipboardContent.objectBounds)) {
            consola.info(`less than ${visibilityThreshold * 100}% of copied content visible: paste to center`);
            position = centerStrategy();
        } else {
            consola.info(`${visibilityThreshold * 100}% or more of copied content visible: paste with shift`);
            position = originStrategy() || centerStrategy();
        }
        /* eslint-enable brace-style */

        commit('setLastPasteBounds', {
            left: position.x,
            top: position.y,
            width: clipboardContent.objectBounds.width,
            height: clipboardContent.objectBounds.height
        });

        const { nodeIds } = await pasteWorkflowParts({
            projectId,
            workflowId: containerId,
            content: clipboardContent.data,
            position
        });
        doAfterPaste();

        dispatch('selection/deselectAllObjects', null, { root: true });
        dispatch('selection/selectNodes', nodeIds, { root: true });
    }
};

export const getters = {
    // TODO: this getter is wrong and seems to take too much computation time while moving compared to before
    isDragging({ movePreviewDelta }) {
        return movePreviewDelta.x !== 0 || movePreviewDelta.y !== 0;
    }
};
