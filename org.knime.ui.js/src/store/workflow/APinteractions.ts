import { API } from '@api';
import { generateWorkflowPreview } from '@/util/generateWorkflowPreview';

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
    async saveWorkflow({ state, dispatch }) {
        const { activeWorkflow: { projectId } } = state;

        const { svgElement, isCanvasEmpty } = await dispatch(
            'application/getActiveWorkflowSnapshot',
            null,
            { root: true }
        );

        const workflowPreviewSvg = await generateWorkflowPreview(svgElement, isCanvasEmpty);

        API.desktop.saveWorkflow({ projectId, workflowPreviewSvg });
    },

    /* Tell the backend to unload this workflow from memory */
    async closeWorkflow({ dispatch, commit, rootState }, closingProjectId) {
        const { openProjects, activeProjectId } = rootState.application;
        const nextProjectId = getNextProjectId({
            openProjects,
            activeProjectId,
            closingProjectId
        });

        const didClose = await API.desktop.closeWorkflow({ closingProjectId, nextProjectId });

        if (!didClose) {
            return;
        }

        dispatch('application/removeCanvasState', closingProjectId, { root: true });
        dispatch('application/removeFromRootWorkflowSnapshots', { projectId: closingProjectId }, { root: true });
        commit('spaces/clearLastItemForProject', { projectId: closingProjectId }, { root: true });
    },

    /* Some nodes generate views from their data. A Classic UI dialog opens to present this view */
    openView({ state }, nodeId) {
        API.desktop.openView({ projectId: state.activeWorkflow.projectId, nodeId });
    },

    /* See docs in API */
    openNodeConfiguration({ state }, nodeId) {
        API.desktop.openNodeDialog({ projectId: state.activeWorkflow.projectId, nodeId });
    },

    /* See docs in API */
    openFlowVariableConfiguration({ state }, nodeId) {
        API.desktop.openLegacyFlowVariableDialog({ projectId: state.activeWorkflow.projectId, nodeId });
    },

    /* See docs in API */
    openLayoutEditor({ state }) {
        const { activeWorkflow: { projectId } } = state;
        const { activeWorkflow: { info: { containerId } } } = state;
        API.desktop.openLayoutEditor({ projectId, workflowId: containerId });
    },

    async saveWorkflowAs({ state, dispatch }) {
        const { activeWorkflow: { projectId } } = state;

        const { svgElement, isCanvasEmpty } = await dispatch(
            'application/getActiveWorkflowSnapshot',
            null,
            { root: true }
        );

        const workflowPreviewSvg = await generateWorkflowPreview(svgElement, isCanvasEmpty);

        API.desktop.saveWorkflowAs({ projectId, workflowPreviewSvg });
    }
};

export const getters = { };
