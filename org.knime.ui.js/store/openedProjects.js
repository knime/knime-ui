import consola from 'consola';

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
    }
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
    switchProject({ state, commit, dispatch }, projectId) {
        commit('setActiveId', projectId);
        dispatch('workflow/loadWorkflow', { projectId }, { root: true });
    }
};
