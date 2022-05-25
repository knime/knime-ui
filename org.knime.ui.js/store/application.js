import { fetchApplicationState, addEventListener, removeEventListener } from '~api';
import Fuse from 'fuse.js';

/*
* This store provides global application logic
*/
export const state = () => ({
    openProjects: [],
    activeProjectId: null,

    /* Map of projectId -> workflowId -> savedState */
    savedUserState: {},

    /* Map of port type id to port type */
    availablePortTypes: {},
    
    // A list provided by the backend that says which ports should be suggested to the user in the port type menu.
    suggestedPortTypes: []
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
    },
    setAvailablePortTypes(state, availablePortTypes) {
        state.availablePortTypes = availablePortTypes;
    },
    setSuggestedPortTypes(state, portTypesIds) {
        state.suggestedPortTypes = portTypesIds;
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
    async replaceApplicationState({ commit, dispatch, state }, applicationState) {
        // NXT-962: rename openendWorkflows to openProjects
        const openProjects = applicationState.openedWorkflows;

        commit('setOpenProjects', openProjects);
        commit('setAvailablePortTypes', applicationState.availablePortTypes);
        commit('setSuggestedPortTypes', applicationState.suggestedPortTypeIds);

        await dispatch('setActiveProject', openProjects);
    },
    async setActiveProject({ commit, dispatch }, openProjects) {
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
        // TODO: NXT-929 re-implement saving the user state

        // // deep clone without observers
        // stateToSave = JSON.parse(JSON.stringify(stateToSave));

        // commit('saveUserState', {
        //     projectId: state.activeProjectId,
        //     workflowId: rootGetters['workflow/activeWorkflowId'],
        //     stateToSave
        // });
    },
    restoreUserState({ state: { savedUserState, activeProjectId }, commit, rootGetters }) {
        // TODO: NXT-929 re-implement saving the user state
        
        // const workflowId = rootGetters['workflow/activeWorkflowId'];

        // // is undefined if opened for the first time
        // const savedState = savedUserState[activeProjectId][workflowId];
        // commit('canvas/restoreState', savedState?.canvas, { root: true });
    }
};

export const getters = {
    portTypeSearch({ availablePortTypes }) {
        let searchItems = Object.entries(availablePortTypes)
            .filter(([_, { hidden }]) => !hidden) // don't index hidden port types
            .map(([typeId, { name }]) => ({
                typeId,
                name
            }));

        let fuzzySearch = new Fuse(searchItems, {
            keys: ['name'],
            shouldSort: true,
            isCaseSensitive: false,
            minMatchCharLength: 0
        });

        return fuzzySearch;
    },
    
    activeProjectName({ openProjects, activeProjectId }) {
        if (!activeProjectId) {
            return null;
        }
        return openProjects.find(project => project.projectId === activeProjectId).name;
    }
};
