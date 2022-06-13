import { openDialog, openLegacyFlowVariableDialog as configureFlowVariables, openView, saveWorkflow, closeWorkflow,
    openLayoutEditor } from '~api';

/**
 * Store that holds a workflow graph and the associated tooltips.
 * A workflow can either be contained in a component / metanode, or it can be the top level workflow.
 * Note that the notion of "workflow" is different from what users call a "KNIME workflow".
 * The technical term for the latter in this application is "project".
 */

export const state = () => ({ });

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
    // TODO: rename to openConfigurationEditor
    openDialog({ state }, nodeId) {
        openDialog({ projectId: state.activeWorkflow.projectId, nodeId });
    },
    
    /* See docs in API */
    // TODO: rename to openFlowVariableEditor
    configureFlowVariables({ state }, nodeId) {
        configureFlowVariables({ projectId: state.activeWorkflow.projectId, nodeId });
    },
    
    /* See docs in API */
    openLayoutEditor({ state, getters }) {
        let { activeWorkflowId } = getters;
        openLayoutEditor({ projectId: state.activeWorkflow.projectId, workflowId: activeWorkflowId });
    }
};

export const getters = { };
