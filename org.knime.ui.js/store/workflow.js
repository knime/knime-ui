import { addEventListener, changeLoopState, changeNodeState, deleteObjects, loadWorkflow as loadWorkflowFromApi,
    moveObjects, openDialog, openLegacyFlowVariableDialog as configureFlowVariables,
    openView, undo, redo, removeEventListener, connectNodes,
    addNode, saveWorkflow, closeWorkflow, renameContainer, collapseToContainer } from '~api';
import Vue from 'vue';
import * as $shapes from '~/style/shapes';
import { actions as jsonPatchActions, mutations as jsonPatchMutations } from '../store-plugins/json-patch';


/**
 * Store that holds a workflow graph and the associated tooltips.
 * A workflow can either be contained in a component / metanode, or it can be the top level workflow.
 * Note that the notion of "workflow" is different from what users call a "KNIME workflow".
 * The technical term for the latter in this application is "project".
 */

export const state = () => ({
    activeWorkflow: null,
    activeSnapshotId: null,
    tooltip: null,
    isDragging: false,
    deltaMovePosition: { x: 0, y: 0 }
});

export const mutations = {
    ...jsonPatchMutations,

    // extracts the workflow
    setActiveWorkflow(state, workflow) {
        state.activeWorkflow = workflow;
    },
    setActiveSnapshotId(state, id) {
        state.activeSnapshotId = id;
    },
    setTooltip(state, tooltip) {
        Vue.set(state, 'tooltip', tooltip);
    },
    // Shifts the position of the node for the provided amount
    shiftPosition(state, { deltaX, deltaY }) {
        state.deltaMovePosition.x = deltaX;
        state.deltaMovePosition.y = deltaY;
    },
    // Reset the position of the outline
    resetDragPosition(state) {
        state.deltaMovePosition = { x: 0, y: 0 };
    },
    // change the isDragging property to the provided Value
    setDragging(state, { isDragging }) {
        state.isDragging = isDragging;
    }
};

export const actions = {
    ...jsonPatchActions,
    async loadWorkflow({ commit, dispatch, getters }, { projectId, workflowId = 'root' }) {
        const project = await loadWorkflowFromApi({ projectId, workflowId });
        if (project) {
            commit('setActiveWorkflow', {
                ...project.workflow,
                projectId
            });

            let snapshotId = project.snapshotId;
            commit('setActiveSnapshotId', snapshotId);

            let workflowId = getters.activeWorkflowId;
            addEventListener('WorkflowChanged', { projectId, workflowId, snapshotId });
        } else {
            throw new Error(`Workflow not found: "${projectId}" > "${workflowId}"`);
        }
    },
    unloadActiveWorkflow({ state, commit, dispatch, getters: { activeWorkflowId }, rootGetters }, { clearWorkflow }) {
        if (!state.activeWorkflow) {
            // nothing to do (no tabs open)
            return;
        }
        // clean up
        try {
            let { projectId } = state.activeWorkflow;
            let { activeSnapshotId: snapshotId } = state;

            removeEventListener('WorkflowChanged', { projectId, workflowId: activeWorkflowId, snapshotId });
        } catch (e) {
            consola.error(e);
        }

        commit('selection/clearSelection', null, { root: true });
        commit('setTooltip', null);
        
        if (clearWorkflow) {
            commit('setActiveWorkflow', null);
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
    changeNodeState({ state, getters, rootGetters }, { action, nodes }) {
        let { activeWorkflow: { projectId } } = state;
        let { activeWorkflowId } = getters;

        if (Array.isArray(nodes)) {
            // act upon a list of nodes
            changeNodeState({ projectId, nodeIds: nodes, action, workflowId: activeWorkflowId });
        } else if (nodes === 'all') {
            // act upon entire workflow
            changeNodeState({ projectId, action, workflowId: activeWorkflowId });
        } else if (nodes === 'selected') {
            // act upon selected nodes
            changeNodeState({
                projectId,
                nodeIds: rootGetters['selection/selectedNodeIds'],
                action,
                workflowId: activeWorkflowId
            });
        } else {
            throw new TypeError("'nodes' has to be of type 'all' | 'selected' | Array<nodeId>]");
        }
    },
    changeLoopState({ state, getters }, { action, nodeId }) {
        let { activeWorkflow: { projectId } } = state;
        let { activeWorkflowId: workflowId } = getters;

        changeLoopState({
            projectId,
            workflowId,
            nodeId,
            action
        });
    },
    executeNodes({ dispatch }, nodes) {
        dispatch('changeNodeState', { action: 'execute', nodes });
    },
    resetNodes({ dispatch }, nodes) {
        dispatch('changeNodeState', { action: 'reset', nodes });
    },
    cancelNodeExecution({ dispatch }, nodes) {
        dispatch('changeNodeState', { action: 'cancel', nodes });
    },
    /* See docs in API */
    pauseLoopExecution({ dispatch }, nodeId) {
        dispatch('changeLoopState', { action: 'pause', nodeId });
    },
    /* See docs in API */
    resumeLoopExecution({ dispatch }, nodeId) {
        dispatch('changeLoopState', { action: 'resume', nodeId });
    },
    /* See docs in API */
    stepLoopExecution({ dispatch }, nodeId) {
        dispatch('changeLoopState', { action: 'step', nodeId });
    },
    /* See docs in API */
    openView({ state }, nodeId) {
        openView({ projectId: state.activeWorkflow.projectId, nodeId });
    },
    /* See docs in API */
    openDialog({ state }, nodeId) {
        openDialog({ projectId: state.activeWorkflow.projectId, nodeId });
    },
    /* See docs in API */
    configureFlowVariables({ state }, nodeId) {
        configureFlowVariables({ projectId: state.activeWorkflow.projectId, nodeId });
    },
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
    saveWorkflow({ state }) {
        let { activeWorkflow: { projectId } } = state;
        saveWorkflow({ projectId });
    },
    closeWorkflow({ dispatch, state }) {
        let { activeWorkflow: { projectId } } = state;
        closeWorkflow({ projectId });
    },

    /**
     * Move either the outline of the nodes or the nodes itself,
     * depending on the amount of selected nodes. Delta is hereby the amount
     * of movement to the last position of the node.
     * @param {Object} context - store context
     * @param {Object} params
     * @param {string} params.deltaX - pixels moved since the last
     * @param {string} params.deltaY - id of the node
     * @returns {void} - nothing to return
     */
    moveNodes({ commit, rootGetters }, { deltaX, deltaY }) {
        commit('shiftPosition', { deltaX, deltaY });
    },

    /**
     * Renames a container (metanode or component).
     * @param {Object} context - store context
     * @param {string} params.nodeId - container node id
     * @param {string} params.name - new new
     * @returns {void} - nothing to return
     */
    renameContainer({ state, getters }, { nodeId, name }) {
        const { activeWorkflow: { projectId } } = state;
        const { activeWorkflowId } = getters;
        renameContainer({
            nodeId,
            name,
            projectId,
            workflowId: activeWorkflowId
        });
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
    saveNodeMoves({ state, getters, commit, rootGetters }, { projectId }) {
        let translation;
        let selectedNodes = rootGetters['selection/selectedNodeIds'];
        // calculate the translation either relative to the position or the outline position
        translation = {
            x: state.deltaMovePosition.x,
            y: state.deltaMovePosition.y
        };
        moveObjects({
            projectId,
            workflowId: getters.activeWorkflowId,
            nodeIds: selectedNodes,
            translation,
            annotationIds: []
        }).then((e) => {
            // nothing todo when movement is successful
        }, (error) => {
            consola.log('The following error occured: ', error);
            commit('resetDragPosition');
        });
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
    async collapseToContainer({ state, getters, rootState, rootGetters, dispatch }, { containerType }) {
        const selectedNodes = rootGetters['selection/selectedNodeIds'];
        let canCollapse = false;

        if (rootGetters['selection/selectedNodes'].some(node => node.allowedActions.canCollapse === 'resetRequired')) {
            canCollapse = window.confirm(`Creating this ${containerType} will reset the executed nodes.`);
        } else {
            canCollapse = true;
        }

        if (canCollapse) {
            dispatch('selection/deselectAllObjects', null, { root: true });

            await collapseToContainer({
                containerType,
                projectId: state.activeWorkflow.projectId,
                workflowId: getters.activeWorkflowId,
                nodeIds: selectedNodes
            });
        }
    }
};

// The name getters can be misleading, its more like Vues computed propeties which may return functions.
// Please consult: https://vuex.vuejs.org/guide/getters.html
export const getters = {
    isStreaming({ activeWorkflow }) {
        return Boolean(activeWorkflow?.info.jobManager);
    },
    isLinked({ activeWorkflow }) {
        return Boolean(activeWorkflow?.info.linked);
    },
    isInsideLinked(state, getters) {
        return Boolean(getters.insideLinkedType);
    },
    insideLinkedType({ activeWorkflow }) {
        if (!activeWorkflow?.parents) {
            return null;
        }

        return activeWorkflow.parents.find(({ linked }) => linked)?.containerType;
    },
    /* Workflow is writable, if it is not linked or inside a linked workflow */
    isWritable(state, getters) {
        return !(getters.isLinked || getters.isInsideLinked);
    },
    /* Workflow is empty if it doesn't contain nodes */
    isWorkflowEmpty({ activeWorkflow }) {
        let hasNodes = Boolean(Object.keys(activeWorkflow?.nodes).length);
        let hasAnnotations = Boolean(activeWorkflow?.workflowAnnotations.length);

        return !hasNodes && !hasAnnotations;
    },
    /*
        returns the upper-left bound [xMin, yMin] and the lower-right bound [xMax, yMax] of the workflow
    */
    workflowBounds({ activeWorkflow }) {
        if (!activeWorkflow) {
            return {
                left: 0,
                top: 0,
                right: 0,
                bottom: 0
            };
        }

        const { nodes = {}, workflowAnnotations = [], metaInPorts, metaOutPorts } = activeWorkflow;
        const {
            nodeSize, nodeNameMargin, nodeStatusMarginTop, nodeStatusHeight, nodeNameLineHeight, portSize,
            defaultMetanodeBarPosition, defaultMetaNodeBarHeight, metaNodeBarWidth, horizontalNodePadding
        } = $shapes;

        let left = Infinity;
        let top = Infinity;
        let right = -Infinity;
        let bottom = -Infinity;

        Object.values(nodes).forEach(({ position: { x, y } }) => {
            const nodeTop = y - nodeNameMargin - nodeNameLineHeight;
            const nodeBottom = y + nodeSize + nodeStatusMarginTop + nodeStatusHeight;
            const nodeLeft = x - horizontalNodePadding;
            const nodeRight = x + nodeSize + horizontalNodePadding;

            if (nodeLeft < left) { left = nodeLeft; }
            if (nodeTop < top) { top = nodeTop; }

            if (nodeRight > right) { right = nodeRight; }
            if (nodeBottom > bottom) { bottom = nodeBottom; }
        });
        workflowAnnotations.forEach(({ bounds: { x, y, height, width } }) => {
            if (x < left) { left = x; }
            if (y < top) { top = y; }

            if (x + width > right) { right = x + width; }
            if (y + height > bottom) { bottom = y + height; }
        });

        // there are neither nodes nor workflows annotations
        if (left === Infinity) {
            left = 0;
            top = 0;
            right = 0;
            bottom = 0;
        }

        // Consider horizontal position of metanode input / output bars.
        // The logic is as follows:
        // - if a user has moved an input / output bar, then its x-position is taken as saved.
        // - else
        //   - input bar
        //     - if the workflow contents extend to a negative coordinate, render the bar left of the workflow contents
        //     - else render it at 0.
        //   - output bar
        //     - if the view is wide enough, the output bar is rendered at a fixed position
        //     - else (horizontal overflow), the output bar is drawn to the right of the workflow contents.
        //
        // The vertical dimensions are always equal to the workflow dimensions, unless the workflow is empty,
        // in which case they get a default height.

        let defaultBarPosition = defaultMetanodeBarPosition;
        if (metaInPorts?.ports?.length) {
            let leftBorder, rightBorder;
            if (metaInPorts.xPos) {
                leftBorder = metaInPorts.xPos - metaNodeBarWidth;
                rightBorder = metaInPorts.xPos + portSize;
            } else {
                leftBorder = Math.min(0, left) - metaNodeBarWidth;
                rightBorder = leftBorder + metaNodeBarWidth + portSize;
            }
            if (leftBorder < left) { left = leftBorder; }
            if (rightBorder > right) { right = rightBorder; }
        }

        if (metaOutPorts?.ports?.length) {
            let leftBorder, rightBorder;
            if (metaOutPorts.xPos) {
                leftBorder = metaOutPorts.xPos - portSize;
                rightBorder = metaOutPorts.xPos + metaNodeBarWidth;
            } else {
                leftBorder = left + defaultBarPosition - portSize;
                rightBorder = leftBorder + metaNodeBarWidth + portSize;
            }
            if (leftBorder < left) { left = leftBorder; }
            if (rightBorder > right) { right = rightBorder; }
        }

        if (metaInPorts?.ports?.length || metaOutPorts?.ports?.length) {
            if (bottom < Math.min(0, top) + defaultMetaNodeBarHeight) {
                bottom = Math.min(0, top) + defaultMetaNodeBarHeight;
            }
        }

        return {
            left,
            top,
            right,
            bottom
        };
    },

    // NXT-962: make this getter obsolete
    activeWorkflowId({ activeWorkflow }) {
        if (!activeWorkflow) {
            return null;
        }
        return activeWorkflow?.info?.containerId || 'root';
    },

    getNodeIcon({ activeWorkflow }) {
        return (nodeId) => {
            let node = activeWorkflow.nodes[nodeId];
            let { templateId } = node;
            if (templateId) {
                return activeWorkflow.nodeTemplates[templateId].icon;
            } else {
                return node.icon;
            }
        };
    },

    getNodeName({ activeWorkflow }) {
        return (nodeId) => {
            let node = activeWorkflow.nodes[nodeId];
            let { templateId } = node;
            if (templateId) {
                return activeWorkflow.nodeTemplates[templateId].name;
            } else {
                return node.name;
            }
        };
    },

    getNodeType({ activeWorkflow }) {
        return (nodeId) => {
            let node = activeWorkflow.nodes[nodeId];
            let { templateId } = node;
            if (templateId) {
                return activeWorkflow.nodeTemplates[templateId].type;
            } else {
                return node.type;
            }
        };
    }
};
