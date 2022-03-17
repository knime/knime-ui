import { fetchApplicationState, addEventListener, removeEventListener } from '~api';

/*
* This store provides global application logic
*/
export const state = () => ({
    openProjects: [],
    activeProjectId: null,

    /* Map of projectId -> workflowId -> savedState */
    savedUserState: {}
});

export const mutations = {
    setActiveProjectId(state, projectId) {
        state.activeProjectId = projectId;
    },
    setOpenProjects(state, projects) {
        state.openProjects = projects.map(({ projectId, name, activeWorkflow }) => activeWorkflow
            ? { projectId, name, activeWorkflow }
            : { projectId, name });

        // add entry to savedUserState for each project
        state.openProjects.forEach(({ projectId }) => {
            state.savedUserState[projectId] = {};
        });
    },
    saveUserState(state, { projectId, workflowId, stateToSave }) {
        state.savedUserState[projectId][workflowId] = stateToSave;
    }
};


export const actions = {
    async initializeApplication({ dispatch }) {
        await addEventListener('AppStateChanged');
        const applicationState = await fetchApplicationState();

        dispatch('replaceApplicationState', applicationState);
    },
    destroyApplication({ dispatch }) {
        removeEventListener('AppStateChanged');
        dispatch('workflow/unloadActiveWorkflow', { clearWorkflow: true }, { root: true });
    },
    // -------------------------------------------------------------------- //
    async replaceApplicationState({ commit, dispatch }, applicationState) {
        // NXT-962: rename openendWorkflows to openProjects
        const openProjects = applicationState.openedWorkflows || [];

        commit('setOpenProjects', openProjects);
        await dispatch('setActiveProject', openProjects);
    },
    async setActiveProject({ state: { openProjects }, commit, dispatch }) {
        if (openProjects.length === 0) {
            consola.info('No workflows opened');
            dispatch('switchWorkflow', null);
            return;
        }

        // either choose the project that has been marked as active, or the first one
        let activeWorkflow = openProjects.find(item => item.activeWorkflow);
        if (!activeWorkflow) {
            consola.info('No active workflow provided');
            activeWorkflow = openProjects[0];
        }

        await dispatch('switchWorkflow', {
            workflowId: 'root',
            projectId: activeWorkflow.projectId
        });
    },
    switchWorkflow({ commit, dispatch, rootGetters }, newWorkflow) {
        // save user state like scroll and zoom
        if (rootGetters['workflow/activeWorkflowId']) {
            dispatch('saveUserState');

            // unload current workflow
            dispatch('workflow/unloadActiveWorkflow', { clearWorkflow: !newWorkflow }, { root: true });
            commit('setActiveProjectId', null);
        }

        // only continue if the new workflow exists
        if (newWorkflow) {
            let { projectId, workflowId } = newWorkflow;
            commit('setActiveProjectId', projectId);
            dispatch('workflow/loadWorkflow', { projectId, workflowId }, { root: true });

            // restore scroll and zoom if saved before
            dispatch('restoreUserState');
        }
    },
    saveUserState({ state, commit, rootState, rootGetters }) {
        let stateToSave = {
            canvas: rootGetters['canvas/toSave']
        };

        // deep clone without observers
        stateToSave = JSON.parse(JSON.stringify(stateToSave));

        commit('saveUserState', {
            projectId: state.activeProjectId,
            workflowId: rootGetters['workflow/activeWorkflowId'],
            stateToSave
        });
    },
    restoreUserState({ state: { savedUserState, activeProjectId }, commit, rootGetters }) {
        const workflowId = rootGetters['workflow/activeWorkflowId'];

        // is undefined if opened for the first time
        const savedState = savedUserState[activeProjectId][workflowId];
        commit('canvas/restoreState', savedState?.canvas, { root: true });
    }
};

