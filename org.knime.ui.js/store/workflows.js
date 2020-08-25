import { fetchApplicationState, loadWorkflow as loadWorkflowFromApi } from '~api';
import consola from 'consola';
import Vue from 'vue';
import * as $shapes from '~/style/shapes';

export const state = () => ({
    workflow: null,
    openedWorkflows: [],
    tooltip: null
});

export const mutations = {
    setWorkflow(state, workflow) {
        consola.debug('setting workflow', workflow?.name, workflow?.projectId, workflow);

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

        state.workflow = workflowData;
        state.tooltip = null;
    },
    setOpenedWorkflows(state, descriptors) {
        state.openedWorkflows = descriptors;
    },
    setTooltip(state, tooltip) {
        Vue.set(state, 'tooltip', tooltip);
    }
};

export const actions = {
    async initState({ commit }) {
        const state = await fetchApplicationState();
        const { activeWorkflows, openedWorkflows } = state;

        commit('setOpenedWorkflows', openedWorkflows);

        // if there is an active workflow, show it
        if (activeWorkflows[0]) {
            commit('setWorkflow', activeWorkflows[0].workflow);
        }
    },
    async loadWorkflow({ commit }, id) {
        const workflow = await loadWorkflowFromApi(id);

        if (workflow) {
            commit('setWorkflow', workflow.workflow);
        } else {
            throw new Error(`workflow not found: ${id}`);
        }
    }
};

export const getters = {
    nodes(state, getters, rootState) {
        return rootState.nodes[state.workflow.projectId];
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
    workflowBounds({ workflow }, getters, rootState) {
        const { nodeIds, workflowAnnotations = [] } = workflow;
        const { nodeSize, nodeNameMargin, nodeStatusMarginTop, nodeStatusHeight } = $shapes;
        let nodes = nodeIds.map(nodeId => getters.nodes[nodeId]);

        let left = Infinity;
        let top = Infinity;
        let right = -Infinity;
        let bottom = -Infinity;

        nodes.forEach(({ position: { x, y } }) => {
            const nodeNameLineHeight = 14;
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
