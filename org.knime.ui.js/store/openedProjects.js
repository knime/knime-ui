/**
* This store holds the currently opened projects (tabs), but not the contained workflow (see workflows.js)
* Upon switching workflows it stores and restores tab-specific ui state like zoom factor and scroll position
*/

export const state = () => ({
    items: [],
    activeId: null,

    /* Map of unique workflow id -> savedState */
    savedState: {}
});

export const mutations = {
    setActiveId(state, activeId) {
        state.activeId = activeId;
    },
    setProjects(state, projects) {
        state.items = projects.map(({ projectId, name }) => ({ projectId, name }));

        // add entry to savedState for each project
        state.savedState = {};
        state.items.forEach(({ projectId }) => {
            state.savedState[projectId] = {};
        });
    },
    saveState(state, { id, state: stateToSave }) {
        state.savedState[id] = stateToSave;
    }
};

export const actions = {
    setProjects({ commit, dispatch }, projects) {
        commit('setProjects', projects);
        let openedWorkflows = projects.filter(item => item.activeWorkflow);

        if (openedWorkflows.length === 0) {
            consola.error('No active workflow provided');
            return;
        } else if (openedWorkflows.length > 1) {
            consola.error('More than one active workflow found. Not supported. Opening only first item.');
        }

        let [workflow] = openedWorkflows;
        let activeWorkflowCfg = {
            ...workflow.activeWorkflow,
            projectId: workflow.projectId
        };
        commit('setActiveId', workflow.projectId);
        dispatch('workflow/setActiveWorkflowSnapshot', activeWorkflowCfg, { root: true });
    },
    async switchWorkflow({ commit, dispatch, rootGetters }, { projectId, workflowId }) {
        commit('setActiveId', projectId);
        await dispatch('workflow/loadWorkflow', { projectId, workflowId }, { root: true });
    }
};
