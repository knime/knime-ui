import { addEventListener, changeLoopState, changeNodeState, deleteObjects, loadWorkflow as loadWorkflowFromApi,
    moveObjects, openDialog, openView, undo, redo, removeEventListener } from '~api';
import Vue from 'vue';
import * as $shapes from '~/style/shapes';
import { actions as jsonPatchActions, mutations as jsonPatchMutations } from '../store-plugins/json-patch';


// Defines the number of nodes above which only the node-outline (drag ghost) is shown when dragging a node.
// This is a performance optimization.
const moveNodeGhostThreshold = 10;

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
    deltaMovePosition: { x: 0, y: 0 },
    moveNodeGhostThresholdExceeded: false
});

export const mutations = {
    ...jsonPatchMutations,
    setActiveWorkflow(state, workflow) {
        // extract templates
        let workflowData = {
            ...workflow
        };

        // add selected, isDragging and dragGhostPosition field to node with initial value false to enable reactivity on this property
        Object.values(workflowData.nodes || {}).forEach(
            node => {
                node.selected = false;
            }
        );

        state.activeWorkflow = workflowData;
        state.tooltip = null;
    },
    setActiveSnapshotId(state, id) {
        state.activeSnapshotId = id;
    },
    setTooltip(state, tooltip) {
        Vue.set(state, 'tooltip', tooltip);
    },
    deselectAllNodes(state) {
        Object.values(state.activeWorkflow.nodes).forEach(node => {
            Vue.set(node, 'selected', false);
        });
    },
    selectAllNodes(state) {
        Object.values(state.activeWorkflow.nodes).forEach(node => {
            Vue.set(node, 'selected', true);
        });
    },
    selectNode(state, nodeId) {
        Vue.set(state.activeWorkflow.nodes[nodeId], 'selected', true);
    },
    deselectNode(state, nodeId) {
        Vue.set(state.activeWorkflow.nodes[nodeId], 'selected', false);
    },
    // Shifts the position of the node for the provided amount
    shiftPosition(state, { deltaX, deltaY, thresholdExceeded }) {
        state.deltaMovePosition.x = deltaX;
        state.deltaMovePosition.y = deltaY;
        state.moveNodeGhostThresholdExceeded = thresholdExceeded;
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
    async loadWorkflow({ commit, dispatch }, { projectId, workflowId = 'root' }) {
        const workflow = await loadWorkflowFromApi({ projectId, workflowId });

        if (workflow) {
            dispatch('unloadActiveWorkflow');
            await dispatch('setActiveWorkflowSnapshot', {
                ...workflow,
                projectId
            });
        } else {
            throw new Error(`Workflow not found: "${projectId}" > "${workflowId}"`);
        }
    },
    unloadActiveWorkflow({ state, getters: { activeWorkflowId: workflowId } }) {
        if (!state.activeWorkflow) {
            // nothing to do (no tabs open)
            return;
        }
        let { projectId } = state.activeWorkflow;
        let { activeSnapshotId: snapshotId } = state;
        try {
            // this is intentionally not awaiting the response. Unloading can happen in the background.
            removeEventListener('WorkflowChanged', { projectId, workflowId, snapshotId });
        } catch (e) {
            consola.error(e);
        }
    },
    async setActiveWorkflowSnapshot({ commit, getters }, { workflow, snapshotId, projectId }) {
        commit('setActiveWorkflow', {
            ...workflow,
            projectId
        });
        commit('setActiveSnapshotId', snapshotId);
        let workflowId = getters.activeWorkflowId;
        await addEventListener('WorkflowChanged', { projectId, workflowId, snapshotId });
    },
    deleteSelectedNodes({
        state: { activeWorkflow: { projectId } },
        getters: { activeWorkflowId, selectedNodes }
    }) {
        let deletableNodeIds = selectedNodes().filter(node => node.allowedActions.canDelete).map(node => node.id);
        let nonDeletableNodeIds = selectedNodes().filter(node => !node.allowedActions.canDelete).map(node => node.id);

        if (deletableNodeIds.length) {
            deleteObjects({
                projectId,
                workflowId: activeWorkflowId,
                nodeIds: deletableNodeIds
            });
        }
        if (nonDeletableNodeIds.length) {
            window.alert(`The following nodes can't be deleted: [${nonDeletableNodeIds.join(', ')}]`);
        }
    },
    changeNodeState({ state, getters }, { action, nodes }) {
        let { activeWorkflow: { projectId } } = state;
        let { activeWorkflowId } = getters;

        if (Array.isArray(nodes)) {
            // act upon a list of nodes
            changeNodeState({ projectId, nodeIds: nodes, action, workflowId: activeWorkflowId });
        } else if (nodes === 'all') {
            // act upon entire workflow
            changeNodeState({ projectId, nodeIds: [activeWorkflowId], action, workflowId: activeWorkflowId });
        } else if (nodes === 'selected') {
            // act upon selected nodes
            changeNodeState({
                projectId,
                nodeIds: getters.selectedNodes().map(node => node.id),
                action,
                workflowId: activeWorkflowId
            });
        } else {
            throw new TypeError("'nodes' has to be of type 'all' | 'selected' | Array<nodeId>]");
        }
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
    pauseNodeExecution({ state }, nodeId) {
        changeLoopState({ projectId: state.activeWorkflow.projectId, nodeId, action: 'pause' });
    },
    /* See docs in API */
    resumeNodeExecution({ state }, nodeId) {
        changeLoopState({ projectId: state.activeWorkflow.projectId, nodeId, action: 'resume' });
    },
    /* See docs in API */
    stepNodeExecution({ state }, nodeId) {
        changeLoopState({ projectId: state.activeWorkflow.projectId, nodeId, action: 'step' });
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
     * Move either the outline of the nodes or the nodes itself,
     * depending on the amount of selected nodes. Delta is hereby the amount
     * of movement to the last position of the node.
     * @param {Object} context - store context
     * @param {Object} params
     * @param {string} params.deltaX - pixels moved since the last
     * @param {string} params.deltaY - id of the node
     * @returns {void} - nothing to return
     */
    moveNodes({ commit, getters }, { deltaX, deltaY }) {
        let thresholdExceeded = getters.selectedNodes().length > moveNodeGhostThreshold;
        commit('shiftPosition', { deltaX, deltaY, thresholdExceeded });
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
    saveNodeMoves({ state, getters, commit }, { projectId, nodeId, startPos }) {
        const selectedNodes = getters.selectedNodes();
        const selectedNodeIds = selectedNodes.map((node) => node.id);
        let translation;
        // calculate the translation either relative to the position or the outline position
        translation = {
            x: state.deltaMovePosition.x,
            y: state.deltaMovePosition.y
        };
        moveObjects({
            projectId,
            workflowId: getters.activeWorkflowId,
            nodeIds: selectedNodeIds,
            translation,
            annotationIds: []
        }).then((e) => {
            // nothing todo when movement is successful
        }, (error) => {
            consola.log('The following error occured: ', error);
            commit('resetDragPosition');
        });
    }
};

export const getters = {
    isLinked({ activeWorkflow }) {
        return Boolean(activeWorkflow?.info.linked);
    },
    isWritable(state, getters) {
        return !getters.isLinked;
    },
    isStreaming({ activeWorkflow }) {
        return Boolean(activeWorkflow?.info.jobManager);
    },
    /*
        returns the upper-left bound [xMin, yMin] and the lower-right bound [xMax, yMax] of the workflow
    */
    workflowBounds({ activeWorkflow }) {
        const { nodes = {}, workflowAnnotations = [], metaInPorts, metaOutPorts } = activeWorkflow;
        const {
            nodeSize, nodeNameMargin, nodeStatusMarginTop, nodeStatusHeight, nodeNameLineHeight, portSize,
            defaultMetanodeBarPosition, defaultMetaNodeBarHeight, metaNodeBarWidth
        } = $shapes;

        let left = Infinity;
        let top = Infinity;
        let right = -Infinity;
        let bottom = -Infinity;

        Object.values(nodes).forEach(({ position: { x, y } }) => {
            const nodeTop = y - nodeNameMargin - nodeNameLineHeight;
            const nodeBottom = y + nodeSize + nodeStatusMarginTop + nodeStatusHeight;

            if (x < left) { left = x; }
            if (nodeTop < top) { top = nodeTop; }

            if (x + nodeSize > right) { right = x + nodeSize; }
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

    activeWorkflowId({ activeWorkflow }) {
        if (!activeWorkflow) {
            return null;
        }
        return activeWorkflow?.info?.containerId || 'root';
    },

    nodeIcon({ activeWorkflow }, getters, rootState) {
        return ({ nodeId }) => {
            let node = activeWorkflow.nodes[nodeId];
            let { templateId } = node;
            if (templateId) {
                return activeWorkflow.nodeTemplates[templateId].icon;
            } else {
                return node.icon;
            }
        };
    },

    nodeName({ activeWorkflow }, getters, rootState) {
        return ({ nodeId }) => {
            let node = activeWorkflow.nodes[nodeId];
            let { templateId } = node;
            if (templateId) {
                return activeWorkflow.nodeTemplates[templateId].name;
            } else {
                return node.name;
            }
        };
    },

    nodeType({ activeWorkflow }, getters, rootState) {
        return ({ nodeId }) => {
            let node = activeWorkflow.nodes[nodeId];
            let { templateId } = node;
            if (templateId) {
                return activeWorkflow.nodeTemplates[templateId].type;
            } else {
                return node.type;
            }
        };
    },

    /**
     * Returns the nodes that are currently selected
     * @param {Object} state - the state of the store
     * @returns {Array} containing the selected nodes
     */
    selectedNodes: ({ activeWorkflow }) => () => {
        if (!activeWorkflow) {
            return [];
        }
        return Object.values(activeWorkflow.nodes).filter(node => node.selected);
    },
};
