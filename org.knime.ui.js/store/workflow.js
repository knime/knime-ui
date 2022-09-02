import Vue from 'vue';

import { actions as jsonPatchActions, mutations as jsonPatchMutations } from '../store-plugins/json-patch';
import * as workflowEditor from './workflow/workflowEditor';
import * as APinteractions from './workflow/APinteractions';
import * as workflowExecution from './workflow/workflowExecution';

import workflowObjectBounds from '~/util/workflowObjectBounds';

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
    tooltip: null,

    // Better place for selected port group
    portGroup: null
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
    },
    setPortGroup(state, portGroup) {
        state.portGroup = portGroup;
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
    
    /* Workflow is empty if it doesn't contain nodes */
    isWorkflowEmpty({ activeWorkflow }) {
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
        if (!activeWorkflow?.parents) {
            return null;
        }

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
        return workflowObjectBounds(activeWorkflow || {}, { padding: true });
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
