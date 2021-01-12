import { loadWorkflow as loadWorkflowFromApi, removeEventListener, addEventListener, executeNodes, cancelNodeExecution,
    resetNodes, openView, openDialog } from '~api';
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
    },
    deselectAllNodes({ activeWorkflow: { nodes } }) {
        Object.values(nodes).forEach(node => {
            node.selected = false;
        });
    },
    selectAllNodes({ activeWorkflow: { nodes } }) {
        Object.values(nodes).forEach(node => {
            node.selected = true;
        });
    },
    selectNode({ activeWorkflow: { nodes } }, nodeId) {
        nodes[nodeId].selected = true;
    },
    deselectNode({ activeWorkflow: { nodes } }, nodeId) {
        nodes[nodeId].selected = false;
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
    unloadActiveWorkflow({ state, getters }) {
        if (!state.activeWorkflow) {
            // nothing to do (no tabs open)
            return;
        }
        let { projectId } = state.activeWorkflow;
        let workflowId = getters.activeWorkflowId;
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
    /* See docs in API */
    executeNodes({ state }, { nodeIds }) {
        executeNodes({ projectId: state.activeWorkflow.projectId, nodeIds });
    },
    /* See docs in API */
    cancelNodeExecution({ state }, { nodeIds }) {
        cancelNodeExecution({ projectId: state.activeWorkflow.projectId, nodeIds });
    },
    /* See docs in API */
    resetNodes({ state }, { nodeIds }) {
        resetNodes({ projectId: state.activeWorkflow.projectId, nodeIds });
    },
    /* See docs in API */
    openView({ state }, { nodeIds }) {
        openView({ projectId: state.activeWorkflow.projectId, nodeIds });
    },
    /* See docs in API */
    openDialog({ state }, { nodeIds }) {
        openDialog({ projectId: state.activeWorkflow.projectId, nodeIds });
    }
};

export const getters = {
    isLinked({ activeWorkflow }) {
        return Boolean(activeWorkflow?.info.linked);
    },
    isWritable(state, getters) {
        return !getters.isLinked;
    },
    /*
        returns the true offset from the upper-left corner of the svg for a given point
    */
    getAbsoluteCoordinates(state, getters, rootState) {
        const { x: left, y: top } = getters.svgBounds;
        return ({ x, y }) => ({ x: x - left, y: y - top });
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
    },

    nodeView(state) {
        return ({ nodeId }) => {
            let node = state.activeWorkflow.nodes[nodeId];
            return node.view;
        };
    },

    nodeDialog(state) {
        return ({ nodeId }) => {
            let node = state.activeWorkflow.nodes[nodeId];
            return node.dialog;
        };
    }
};
