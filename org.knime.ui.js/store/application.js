import { fetchApplicationState } from '~api';

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
        state.openProjects = projects.map(({ projectId, name }) => ({ projectId, name }));

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
    async initState({ dispatch }) {
        const { openedWorkflows = [] } = await fetchApplicationState();

        dispatch('setProjects', openedWorkflows);
    },

    setProjects({ commit, dispatch }, projects) {
        commit('setOpenProjects', projects);
        let activeWorkflows = projects.filter(item => item.activeWorkflow);

        if (activeWorkflows.length === 0) {
            consola.info('No active workflow provided');
        } else if (activeWorkflows.length > 1) {
            consola.error('More than one active workflow found. Not supported. Opening only first item.');
        }

        let [activeWorkflow] = activeWorkflows;

        // if the active workflow is not the current, then unload the current workflow
        if (!activeWorkflow) {
            dispatch('switchWorkflow', null);
            return;
        }

        // if there is a new active workflow, open that workflow
        dispatch('switchWorkflow', {
            ...activeWorkflow.activeWorkflow,
            projectId: activeWorkflow.projectId
        });
    },
    async switchWorkflow({ commit, dispatch, rootGetters }, newWorkflow) {
        // save scroll and zoom
        if (rootGetters['workflow/activeWorkflowId']) {
            await dispatch('saveUserState');
        }
        
        // unload current workflow
        dispatch('workflow/unloadActiveWorkflow', null, { root: true });
        commit('setActiveProjectId', null);

        // only continue if the new workflow exists
        if (newWorkflow) {
            let { projectId, workflowId } = newWorkflow;
            commit('setActiveProjectId', projectId);
            await dispatch('workflow/loadWorkflow', { projectId, workflowId }, { root: true });

            // restore scroll and zoom if saved before
            await dispatch('restoreUserState');
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

