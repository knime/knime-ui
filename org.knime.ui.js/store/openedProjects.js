/**
* This store holds the currently opened projects (tabs), but not the contained workflow (see workflows.js)
*/

export const state = () => ({
    items: [],
    activeId: null
});

export const mutations = {
    setActiveId(state, activeId) {
        state.activeId = activeId;
    },
    setProjects(state, projects) {
        state.items = projects.map(({ projectId, name }) => ({ projectId, name }));
    },
    saveState(state, { project, savedState }) {
        project.savedState = savedState;
    }
};

export const getters = {
    activeProject: state => state.items.find(({ projectId }) => projectId === state.activeId)
};

export const actions = {
    setProjects({ commit, dispatch }, projects) {
        commit('setProjects', projects);
        let openedWorkflows = projects.filter(item => item.activeWorkflow);
        let found = false;
        openedWorkflows.forEach(item => {
            if (found) {
                consola.error('More than one active workflow found. Not supported. Opening only first item.');
                return;
            }
            found = true;
            let activeWorkflowCfg = {
                ...item.activeWorkflow,
                projectId: item.projectId
            };
            commit('setActiveId', item.projectId);
            dispatch('workflow/setActiveWorkflowSnapshot', activeWorkflowCfg, { root: true });
        });
        if (projects.length && !found) {
            consola.error('No active workflow provided');
        }
    },
    async switchProject({ state, commit, dispatch }, projectId) {
        await dispatch('saveTabState');
        commit('setActiveId', projectId);
        await dispatch('workflow/loadWorkflow', { projectId }, { root: true });
        await dispatch('restoreTabState');
    },
    saveTabState({ state, commit, dispatch, rootState, getters }, projectId) {
        let savedState = {
            canvas: rootState.canvas
        };

        // deep clone without observers
        savedState = JSON.parse(JSON.stringify(savedState));

        commit('saveState', { project: getters.activeProject, savedState });
    },
    restoreTabState({ state, commit, dispatch, rootState, getters }) {
        let savedState = getters.activeProject.savedState;
        if (savedState) {
            commit('canvas/restoreState', savedState.canvas, { root: true });
        }
    }
};
