import { openNodeDialog, openLegacyFlowVariableDialog, openView, saveWorkflow, closeWorkflow,
    openLayoutEditor } from '@api';

/**
 * Determines which project id should be set after closing the active one
 *
 * @param {Object} param
 * @param {Array} param.openProjects
 * @param {String} param.activeProjectId
 * @param {String} param.closingProjectId
 * @returns {String} next project id to set
 */
const getNextProjectId = ({ openProjects, activeProjectId, closingProjectId }) => {
    if (closingProjectId !== activeProjectId) {
        return activeProjectId;
    }

    if (openProjects.length === 1) {
        return null;
    }

    const activeProjectIndex = openProjects.findIndex(({ projectId }) => projectId === activeProjectId);
    const isLastIndex = openProjects.length - 1 === activeProjectIndex;
    const nextIndex = isLastIndex ? activeProjectIndex - 1 : activeProjectIndex + 1;

    return openProjects[nextIndex].projectId;
};

/**
 * This store is merged with the workflow store.
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
    async closeWorkflow({ dispatch, rootState }, closingProjectId) {
        const { openProjects, activeProjectId } = rootState.application;
        const nextProjectId = getNextProjectId({
            openProjects,
            activeProjectId,
            closingProjectId
        });

        const didClose = await closeWorkflow({ closingProjectId, nextProjectId });
        
        if (didClose) {
            dispatch('application/removeCanvasState', closingProjectId, { root: true });
        }
    },
    
    /* Some nodes generate views from their data. A Classic UI dialog opens to present this view */
    openView({ state }, nodeId) {
        openView({ projectId: state.activeWorkflow.projectId, nodeId });
    },
    
    /* See docs in API */
    openNodeConfiguration({ state }, nodeId) {
        openNodeDialog({ projectId: state.activeWorkflow.projectId, nodeId });
    },
    
    /* See docs in API */
    openFlowVariableConfiguration({ state }, nodeId) {
        openLegacyFlowVariableDialog({ projectId: state.activeWorkflow.projectId, nodeId });
    },
    
    /* See docs in API */
    openLayoutEditor({ state, getters }) {
        let { activeWorkflow: { projectId } } = state;
        let { activeWorkflow: { info: { containerId } } } = state;
        openLayoutEditor({ projectId, workflowId: containerId });
    }
};

export const getters = { };
