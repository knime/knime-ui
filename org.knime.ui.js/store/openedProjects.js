/**
* This store holds the currently opened projects (tabs), but not the contained workflow (see workflows.js)
*/

export const state = () => ({
    items: [],
    activeId: null,
    savedState: {}
});

export const mutations = {
    setActiveId(state, activeId) {
        state.activeId = activeId;
    },
    setProjects(state, projects) {
        state.items = projects.map(({ projectId, name }) => ({ projectId, name }));
    },
    saveState(state, { projectId, workflowId, savedState }) {
        let projectState = state.savedState[projectId];
        if (!projectState) {
            projectState = {};
            state.savedState[projectId] = projectState;
        }
        projectState[workflowId] = savedState;
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
    async switchWorkflow({ commit, dispatch, rootGetters }, { projectId, workflowId }) {
        if (rootGetters['workflow/activeWorkflowId']) {
            await dispatch('saveTabState');
        }

        commit('setActiveId', projectId);
        await dispatch('workflow/loadWorkflow', { projectId, workflowId }, { root: true });
        await dispatch('restoreTabState');
    },
    saveTabState({ state, commit, rootState, rootGetters }) {
        let savedState = {
            canvas: rootGetters['canvas/saveState']
        };

        // deep clone without observers
        savedState = JSON.parse(JSON.stringify(savedState));

        commit('saveState', {
            projectId: state.activeId,
            workflowId: rootGetters['workflow/activeWorkflowId'],
            savedState
        });
    },
    restoreTabState({ state: { savedState, activeId }, commit, rootGetters }) {
        const workflowId = rootGetters['workflow/activeWorkflowId'];

        // is undefined if opened for the first time
        const savedWorkflowState = savedState[activeId]?.[workflowId];
        commit('canvas/restoreState', savedWorkflowState?.canvas, { root: true });
    }
};
