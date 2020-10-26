import { loadWorkflow as loadWorkflowFromApi, removeEventListener, addEventListener } from '~api';
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
        let { nodeTemplates = {} } = workflow;
        let nodeTemplateIds = Object.keys(nodeTemplates);

        // …and move them to template store
        nodeTemplateIds.forEach((templateId) => {
            this.commit('nodeTemplates/add', {
                templateId,
                templateData: nodeTemplates[templateId]
            }, { root: true });
        });
        delete workflowData.nodeTemplates;

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
    async loadWorkflow({ commit, dispatch }, { projectId, containerId = 'root' }) {
        const workflow = await loadWorkflowFromApi({ projectId, containerId });

        if (workflow) {
            dispatch('unloadActiveWorkflow');
            dispatch('setActiveWorkflowSnapshot', {
                ...workflow,
                projectId
            });
        } else {
            throw new Error(`Workflow not found: "${projectId}" > "${containerId}"`);
        }
    },
    unloadActiveWorkflow({ state, getters }) {
        if (!state.activeWorkflow) {
            // nothing to do (no tabs open)
            return;
        }
        let { projectId } = state.activeWorkflow;
        let workflowId = getters.activeWorkflowId;
        // this is intentionally not awaiting the response. Unloading can happen in the background.
        removeEventListener('WorkflowChanged', { projectId, workflowId });
    },
    setActiveWorkflowSnapshot({ commit }, { workflow, snapshotId, projectId }) {
        commit('setActiveWorkflow', {
            ...workflow,
            projectId
        });
        commit('setActiveSnapshotId', snapshotId);
        let workflowId = workflow.info?.containerId || 'root';
        addEventListener('WorkflowChanged', { projectId, workflowId, snapshotId });
    }
};

export const getters = {
    /*
        returns the true offset from the upper-left corner of the svg for a given point
    */
    getAbsoluteCoordinates(state, getters, rootState) {
        const { x: left, y: top } = getters.svgBounds;
        return (x, y) => ({ x: x - left, y: y - top });
    },
    /*
        extends the workflowBounds by a fixed padding
    */
    svgBounds(state, getters, rootState) {
        const { canvasPadding } = $shapes;
        let { left, top, right, bottom } = getters.workflowBounds;
        let x = Math.min(0, left);
        let y = Math.min(0, top);
        let width = right - x + canvasPadding;
        let height = bottom - y + canvasPadding;
        return {
            x, y, width, height
        };
    },
    /*
        returns the upper-left bound [xMin, yMin] and the lower-right bound [xMax, yMax] of the workflow
    */
    workflowBounds({ activeWorkflow }) {
        const { nodes = {}, workflowAnnotations = [] } = activeWorkflow;
        const { nodeSize, nodeNameMargin, nodeStatusMarginTop, nodeStatusHeight, nodeNameLineHeight } = $shapes;

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

    nodeIcon(state, getters, rootState) {
        return ({ nodeId }) => {
            let node = state.activeWorkflow.nodes[nodeId];
            let { templateId } = node;
            if (templateId) {
                return rootState.nodeTemplates[templateId].icon;
            } else {
                return node.icon;
            }
        };
    },

    nodeName(state, getters, rootState) {
        return ({ nodeId }) => {
            let node = state.activeWorkflow.nodes[nodeId];
            let { templateId } = node;
            if (templateId) {
                return rootState.nodeTemplates[templateId].name;
            } else {
                return node.name;
            }
        };
    },

    nodeType(state, getters, rootState) {
        return ({ nodeId }) => {
            let node = state.activeWorkflow.nodes[nodeId];
            let { templateId } = node;
            if (templateId) {
                return rootState.nodeTemplates[templateId].type;
            } else {
                return node.type;
            }
        };
    }
};
