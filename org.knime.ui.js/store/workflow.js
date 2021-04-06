import { loadWorkflow as loadWorkflowFromApi, removeEventListener, addEventListener,
    openView, openDialog, changeNodeState, changeLoopState, deleteObjects } from '~api';
import Vue from 'vue';
import * as $shapes from '~/style/shapes';
import { mutations as jsonPatchMutations, actions as jsonPatchActions } from '../store-plugins/json-patch';
/**
 * Store that holds a workflow graph and the associated tooltips.
 * A workflow can either be contained in a component / metanode, or it can be the top level workflow.
 * Note that the notion of "workflow" is different from what users call a "KNIME workflow".
 * The technical term for the latter in this application is "project".
 */

export const state = () => ({
    activeWorkflow: null,
    activeSnapshotId: null,
    tooltip: null
});

export const mutations = {
    ...jsonPatchMutations,
    setActiveWorkflow(state, workflow) {
        // extract templates
        let workflowData = {
            ...workflow
        };

        // add selected field to node with initial value false to enable reactivity on this property
        Object.values(workflowData.nodes || {}).forEach(node => { node.selected = false; });

        state.activeWorkflow = workflowData;
        state.tooltip = null;
    },
    setActiveSnapshotId(state, id) {
        state.activeSnapshotId = id;
    },
    setTooltip(state, tooltip) {
        Vue.set(state, 'tooltip', tooltip);
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
    deleteSelectedObjects({
        state: { activeWorkflow: { projectId } },
        getters: { activeWorkflowId }
    }, { selectedNodes, selectedConnections }) {
        let deletableNodeIds = selectedNodes().filter(node => node.allowedActions.canDelete).map(node => node.id);
        let nonDeletableNodeIds = selectedNodes().filter(node => !node.allowedActions.canDelete).map(node => node.id);
        let deleteableConnectionIds = selectedConnections().filter(connection => connection.canDelete).
            map(connection => `${connection.destNode}_${connection.destPort}`);
        let nonDeletableConnectionIds = selectedConnections().filter(connection => !connection.canDelete).
            map(connection => `${connection.destNode}_${connection.destPort}`);

        if (deletableNodeIds.length || deleteableConnectionIds.length) {
            deleteObjects({
                projectId,
                workflowId: activeWorkflowId,
                nodeIds: deletableNodeIds.length ? deletableNodeIds : [],
                connectionIds: deleteableConnectionIds ? deleteableConnectionIds : []
            });
        }
        if (nonDeletableNodeIds.length || nonDeletableConnectionIds.length) {
            window.alert(`The following nodes can't be deleted: [${nonDeletableNodeIds.join(', ')}] \n
                          The following connections can't be deleted: [${nonDeletableConnectionIds.join(', ')}]`);
        }
    },
    changeNodeState({ state, getters }, { action, nodes }) {
        let { activeWorkflow: { projectId } } = state;
        let { activeWorkflowId } = getters;

        if (Array.isArray(nodes)) {
            // act upon a list of nodes
            changeNodeState({ projectId, nodeIds: nodes, action });
        } else if (nodes === 'all') {
            // act upon entire workflow
            changeNodeState({ projectId, nodeIds: [activeWorkflowId], action });
        } else if (nodes === 'selected') {
            // act upon selected nodes
            changeNodeState({ projectId, nodeIds: getters.selectedNodes.map(node => node.id), action });
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
        return activeWorkflow?.info.containerId || 'root';
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
    }
};
