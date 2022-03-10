/**
* This store holds the currently opened projects (tabs), but not the contained workflow (see workflows.js)
* Upon switching workflows it stores and restores tab-specific ui state like zoom factor and scroll position
*/

export const state = () => ({
    items: [],
    activeId: null,

    /* Map of projectId -> workflowId -> savedState */
    savedState: {}
});

export const mutations = {
    setActiveId(state, activeId) {
        state.activeId = activeId;
    },
    setProjects(state, projects) {
        state.items = projects.map(({ projectId, name }) => ({ projectId, name }));

        // add entry to savedState for each project
        state.items.forEach(({ projectId }) => {
            state.savedState[projectId] = {};
        });
    },
    saveState(state, { projectId, workflowId, savedState }) {
        state.savedState[projectId][workflowId] = savedState;
    }
};

export const actions = {
    setProjects({ commit, dispatch }, projects) {
        commit('setProjects', projects);
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
            await dispatch('saveState');
        }
        
        // unload current workflow
        dispatch('workflow/unloadActiveWorkflow', null, { root: true });
        commit('setActiveId', null);

        // only continue if the new workflow exists
        if (newWorkflow) {
            let { projectId, workflowId } = newWorkflow;
            commit('setActiveId', projectId);
            await dispatch('workflow/loadWorkflow', { projectId, workflowId }, { root: true });

            // restore scroll and zoom if saved before
            await dispatch('restoreState');
        }
    },
    saveState({ state, commit, rootState, rootGetters }) {
        let savedState = {
            canvas: rootGetters['canvas/toSave']
        };

        // deep clone without observers
        savedState = JSON.parse(JSON.stringify(savedState));

        commit('saveState', {
            projectId: state.activeId,
            workflowId: rootGetters['workflow/activeWorkflowId'],
            savedState
        });
    },
    restoreState({ state: { savedState, activeId }, commit, rootGetters }) {
        const workflowId = rootGetters['workflow/activeWorkflowId'];

        // is undefined if opened for the first time
        const savedWorkflowState = savedState[activeId][workflowId];
        commit('canvas/restoreState', savedWorkflowState?.canvas, { root: true });
    }
};
