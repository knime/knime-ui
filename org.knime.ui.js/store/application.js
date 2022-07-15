import { fetchApplicationState, addEventListener, removeEventListener, loadWorkflow } from '~api';
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
    suggestedPortTypes: [],

    // A list of user's saved states
    savedStates: [],

    /* Indicates whether the browser has support (enabled) for the Clipboard API or not */
    hasClipboardSupport: false
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
    },
    setSavedStates(state, savedStates) {
        state.savedStates =
        [...state.savedStates.filter((savedState) => savedState.workflow !== savedStates.workflow ||
            savedState.project !== savedStates.project), { ...savedStates }];
    },
    setHasClipboardSupport(state, hasClipboardSupport) {
        state.hasClipboardSupport = hasClipboardSupport;
    }
};

export const actions = {
    /*
     *   A P P L I C A T I O N   L I F E C Y C L E
     */
    async initializeApplication({ dispatch }) {
        await addEventListener('AppStateChanged');
        
        const applicationState = await fetchApplicationState();
        await dispatch('replaceApplicationState', applicationState);
    },
    
    destroyApplication({ dispatch }) {
        removeEventListener('AppStateChanged');
        dispatch('unloadActiveWorkflow', { clearWorkflow: true });
    },
    // -------------------------------------------------------------------- //
    async replaceApplicationState({ commit, dispatch, state }, applicationState) {
        // NXT-962: rename openedWorkflows to openProjects
        const openProjects = applicationState.openedWorkflows;

        commit('setOpenProjects', openProjects);
        commit('setAvailablePortTypes', applicationState.availablePortTypes);
        commit('setSuggestedPortTypes', applicationState.suggestedPortTypeIds);

        await dispatch('setActiveProject', openProjects);
    },
    async setActiveProject({ commit, dispatch }, openProjects) {
        if (openProjects.length === 0) {
            consola.info('No workflows opened');
            await dispatch('switchWorkflow', null);
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

    /*
     *   W O R K F L O W   L I F E C Y C L E
     */

    async switchWorkflow({ commit, dispatch, rootGetters }, newWorkflow) {
        // save user state like scroll and zoom
        if (rootGetters['workflow/activeWorkflowId']) {
            dispatch('saveUserState');

            // unload current workflow
            dispatch('unloadActiveWorkflow', { clearWorkflow: !newWorkflow });
            commit('setActiveProjectId', null);
        }

        // only continue if the new workflow exists
        if (newWorkflow) {
            let { projectId, workflowId } = newWorkflow;
            commit('setActiveProjectId', projectId);
            await dispatch('loadWorkflow', { projectId, workflowId });
        }
    },
    async loadWorkflow({ commit, rootGetters }, { projectId, workflowId = 'root' }) {
        const project = await loadWorkflow({ projectId, workflowId });
        if (project) {
            commit('workflow/setActiveWorkflow', {
                ...project.workflow,
                projectId
            }, { root: true });

            let snapshotId = project.snapshotId;
            commit('workflow/setActiveSnapshotId', snapshotId, { root: true });

            // NXT-962: make this getter obsolete and always include the workflowId in the data
            let workflowId = rootGetters['workflow/activeWorkflowId'];
            addEventListener('WorkflowChanged', { projectId, workflowId, snapshotId });
        } else {
            throw new Error(`Workflow not found: "${projectId}" > "${workflowId}"`);
        }
    },
    unloadActiveWorkflow({ commit, rootGetters, rootState }, { clearWorkflow }) {
        let activeWorkflow = rootState.workflow.activeWorkflow;

        // nothing to do (no tabs open)
        if (!activeWorkflow) {
            return;
        }
        
        // clean up
        let { projectId } = activeWorkflow;
        let { activeSnapshotId: snapshotId } = rootState.workflow;
        let workflowId = rootGetters['workflow/activeWorkflowId'];

        removeEventListener('WorkflowChanged', { projectId, workflowId, snapshotId });
       
        commit('selection/clearSelection', null, { root: true });
        commit('workflow/setTooltip', null, { root: true });
        
        if (clearWorkflow) {
            commit('workflow/setActiveWorkflow', null, { root: true });
        }
    },
    restoreUserState({ state, commit, rootGetters }, workflow) {
        const { projectId, workflowId } = workflow;
        const savedStates = state.savedStates;

        const savedState = savedStates.find((savedState) => workflowId === savedState.workflow &&
        projectId === savedState.project);

        if (savedState) {
            commit('canvas/restoreState', savedState, { root: true });
        }
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
