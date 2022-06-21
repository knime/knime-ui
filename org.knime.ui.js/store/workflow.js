import Vue from 'vue';

import { actions as jsonPatchActions, mutations as jsonPatchMutations } from '../store-plugins/json-patch';
import * as workflowEditor from './workflow/workflowEditor';
import * as APinteractions from './workflow/APinteractions';
import * as workflowExecution from './workflow/workflowExecution';

import * as $shapes from '~knime-ui/style/shapes';

/**
 * The workflow store holds a workflow graph and the associated tooltips.
 * The store is split up into several files.
 *
 * A workflow can either be contained in a component / metanode, or it can be the top level workflow.
 * Note that the notion of "workflow" is different from what users call a "KNIME workflow".
 * The technical term for the latter in this application is "project".
 */

export const state = () => ({
    ...workflowExecution.state,
    ...workflowEditor.state,
    ...APinteractions.state,
    
    // TODO: rename to just workflow someday
    activeWorkflow: null,
    activeSnapshotId: null,

    // TODO: NXT-1143 find a better place for the tooltip logic
    // maybe use an event that bubbles to the top (workflow canvas?)
    tooltip: null
});

export const mutations = {
    ...jsonPatchMutations,
    ...workflowExecution.mutations,
    ...workflowEditor.mutations,
    ...APinteractions.mutations,

    setActiveWorkflow(state, workflow) {
        state.activeWorkflow = workflow;
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
    ...workflowExecution.actions,
    ...workflowEditor.actions,
    ...APinteractions.actions
};

export const getters = {
    ...workflowExecution.getters,
    ...workflowEditor.getters,
    ...APinteractions.getters,
    
    // NXT-962: make this getter obsolete and always include the workflowId in the data
    activeWorkflowId({ activeWorkflow }) {
        if (!activeWorkflow) {
            return null;
        }
        return activeWorkflow?.info?.containerId || 'root';
    },

    /* Workflow is empty if it doesn't contain nodes */
    isWorkflowEmpty({activeWorkflow}) {
        if (!state.activeWorkflow) { return null; }

        let hasNodes = Boolean(Object.keys(activeWorkflow?.nodes).length);
        let hasAnnotations = Boolean(activeWorkflow?.workflowAnnotations.length);

        return !hasNodes && !hasAnnotations;
    },

    isStreaming({ activeWorkflow }) {
        return Boolean(activeWorkflow?.info.jobManager);
    },

    isLinked({ activeWorkflow }) {
        return Boolean(activeWorkflow?.info.linked);
    },
    insideLinkedType({ activeWorkflow }) {
        if (!activeWorkflow?.parents) { return null; }

        return activeWorkflow.parents.find(({ linked }) => linked)?.containerType;
    },
    isInsideLinked(state, getters) {
        return Boolean(getters.insideLinkedType);
    },

    /* Workflow is writable, if it is not linked or inside a linked workflow */
    isWritable(state, { isLinked, isInsideLinked }) {
        const linkage = isLinked || isInsideLinked;

        // TODO: document better under which conditions a workflow is not writable
        return !linkage;
    },

    /* returns the upper-left bound [xMin, yMin] and the lower-right bound [xMax, yMax] of the workflow */
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

    getNodeIcon: ({ activeWorkflow }) => nodeId => {
        let node = activeWorkflow.nodes[nodeId];
        let { templateId } = node;
        if (templateId) {
            return activeWorkflow.nodeTemplates[templateId].icon;
        } else {
            return node.icon;
        }
    },

    getNodeName: ({ activeWorkflow }) => nodeId => {
        let node = activeWorkflow.nodes[nodeId];
        let { templateId } = node;
        if (templateId) {
            return activeWorkflow.nodeTemplates[templateId].name;
        } else {
            return node.name;
        }
    },

    getNodeType: ({ activeWorkflow }) => nodeId => {
        let node = activeWorkflow.nodes[nodeId];
        let { templateId } = node;
        if (templateId) {
            return activeWorkflow.nodeTemplates[templateId].type;
        } else {
            return node.type;
        }
    }
};
