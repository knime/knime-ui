import { loadWorkflow as loadWorkflowFromApi } from '~api';
import Vue from 'vue';
import * as $shapes from '~/style/shapes';

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
    setActiveWorkflow(state, workflow) {
        // extract nodes
        let { nodes = {} } = workflow;
        let nodeIds = Object.keys(nodes);
        let workflowData = {
            ...workflow,
            nodeIds
        };

        // remove all existing nodes of this workflow from Nodes store
        this.commit('nodes/removeWorkflow', workflow.projectId, { root: true });

        // …and move all nodes to Nodes store
        nodeIds.forEach((nodeId) => {
            this.commit('nodes/add', {
                workflowId: workflow.projectId,
                nodeData: nodes[nodeId]
            }, { root: true });
        });
        delete workflowData.nodes;

        // extract templates
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
    async loadWorkflow({ commit, dispatch }, { projectId, containerId = 'root' }) {
        const workflow = await loadWorkflowFromApi(projectId, containerId);

        if (workflow) {
            dispatch('setActiveWorkflowSnapshot', {
                ...workflow,
                projectId
            });
        } else {
            throw new Error(`workflow not found: "${projectId}" > "${containerId}"`);
        }
    },
    setActiveWorkflowSnapshot({ commit }, { workflow, snapshotId, projectId }) {
        commit('setActiveWorkflow', {
            ...workflow,
            projectId
        });
        commit('setActiveSnapshotId', snapshotId);
    }
};

export const getters = {
    nodes(state, getters, rootState) {
        return rootState.nodes[state.activeWorkflow.projectId];
    },
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
    workflowBounds({ activeWorkflow }, getters, rootState) {
        const { nodeIds, workflowAnnotations = [] } = activeWorkflow;
        const { nodeSize, nodeNameMargin, nodeStatusMarginTop, nodeStatusHeight, nodeNameLineHeight } = $shapes;
        let nodes = nodeIds.map(nodeId => getters.nodes[nodeId]);

        let left = Infinity;
        let top = Infinity;
        let right = -Infinity;
        let bottom = -Infinity;

        nodes.forEach(({ position: { x, y } }) => {
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
    }
};
