import { openNodeDialog, openLegacyFlowVariableDialog, openView, saveWorkflow, closeWorkflow,
    openLayoutEditor } from '~api';

/**
 * This store is not instantiated by Nuxt but merged with the workflow store.
 * It holds all calls from the workflow store to the local Analytics Platform.
 */

export const state = { };

export const mutations = { };

export const actions = {
    /* See docs in API */
    saveWorkflow({ state }) {
        let { activeWorkflow: { projectId } } = state;
        saveWorkflow({ projectId });
    },

    /* Tell the backend to unload this workflow from memory */
    closeWorkflow({ dispatch, state }) {
        let { activeWorkflow: { projectId } } = state;
        closeWorkflow({ projectId });
    },
    
    /* Some nodes generate views from their data. A Classic UI dialog opens to present this view */
    openView({ state }, nodeId) {
        openView({ projectId: state.activeWorkflow.projectId, nodeId });
    },
    
    /* See docs in API */
    // TODO: rename to openNodeConfiguration
    openNodeConfiguration({ state }, nodeId) {
        openNodeDialog({ projectId: state.activeWorkflow.projectId, nodeId });
    },
    
    /* See docs in API */
    openFlowVariableConfiguration({ state }, nodeId) {
        openLegacyFlowVariableDialog({ projectId: state.activeWorkflow.projectId, nodeId });
    },
    
    /* See docs in API */
    openLayoutEditor({ state, getters }) {
        let { activeWorkflowId } = getters;
        openLayoutEditor({ projectId: state.activeWorkflow.projectId, workflowId: activeWorkflowId });
    }
};

export const getters = { };
