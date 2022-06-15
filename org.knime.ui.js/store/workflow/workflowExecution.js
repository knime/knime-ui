import { changeLoopState, changeNodeState } from '~api';

/**
 * This store is not instantiated by Nuxt but merged with the workflow store.
 * It holds all calls from the workflow store to the API regarding execution.
 */

export const state = { };
export const mutations = {};

export const actions = {
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
    }
};

export const getters = { };
