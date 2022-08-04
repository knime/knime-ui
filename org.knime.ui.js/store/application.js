import Vue from 'vue';
import { fetchApplicationState, addEventListener, removeEventListener, loadWorkflow } from '~api';
import { makeTypeSearch } from '~/util/fuzzyPortTypeSearch';

const getCanvasStateKey = ({ workflow, project }) => `${window.btoa(workflow)}--${window.btoa(project)}`;

/*
 * This store provides global application logic
 */
export const state = () => ({
    openProjects: [],
    activeProjectId: null,

    /* Map of port type id to port type */
    availablePortTypes: {},
    
    // A list provided by the backend that says which ports should be suggested to the user in the port type menu.
    suggestedPortTypes: [],

    savedCanvasStates: {},

    /* Indicates whether the browser has support (enabled) for the Clipboard API or not */
    hasClipboardSupport: false
});

export const mutations = {
    setActiveProjectId(state, projectId) {
        state.activeProjectId = projectId;
    },
    setOpenProjects(state, projects) {
        state.openProjects = projects.map(({ projectId, name }) => ({ projectId, name }));
    },
    setAvailablePortTypes(state, availablePortTypes) {
        state.availablePortTypes = availablePortTypes;
    },
    setSuggestedPortTypes(state, portTypesIds) {
        state.suggestedPortTypes = portTypesIds;
    },
    setSavedCanvasStates(state, newStates) {
        const { workflow, project } = newStates;
        const newStateKey = getCanvasStateKey({ workflow, project });

        state.savedCanvasStates = {
            ...state.savedCanvasStates,
            [newStateKey]: newStates
        };
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

        let activeProject = openProjects.find(item => item.activeWorkflow);
        if (activeProject) {
            // active project is attached to the list of tabs
            dispatch('setWorkflow', {
                projectId: activeProject.projectId,
                workflow: activeProject.activeWorkflow.workflow,
                snapshotId: activeProject.activeWorkflow.snapshotId
            });
        } else {
            consola.info('No active workflow provided');

            // chose root workflow of first tab
            activeProject = openProjects[0];
            await dispatch('loadWorkflow', {
                projectId: activeProject.projectId,
                // ATTENTION: we can only open tabs, that have root workflows (no standalone metanodes or components)
                workflowId: 'root'
            });
        }
    },

    /*
     *   W O R K F L O W   L I F E C Y C L E
     */

    async switchWorkflow({ commit, dispatch, rootState }, newWorkflow) {
        // save user state like scroll and zoom
        if (rootState.workflow?.activeWorkflow) {
            dispatch('saveCanvasState');

            // unload current workflow
            dispatch('unloadActiveWorkflow', { clearWorkflow: !newWorkflow });
            commit('setActiveProjectId', null);
        }

        // only continue if the new workflow exists
        if (newWorkflow) {
            let { projectId, workflowId } = newWorkflow;
            await dispatch('loadWorkflow', { projectId, workflowId });

            await Vue.nextTick();
            await Vue.nextTick();

            // restore scroll and zoom if saved before
            dispatch('restoreCanvasState');
        }
    },
    async loadWorkflow({ commit, rootState, dispatch }, { projectId, workflowId = 'root' }) {
        const project = await loadWorkflow({ projectId, workflowId });
        if (project) {
            dispatch('setWorkflow', {
                projectId,
                workflow: project.workflow,
                snapshotId: project.snapshotId
            });
        } else {
            throw new Error(`Workflow not found: "${projectId}" > "${workflowId}"`);
        }
    },
    setWorkflow({ commit }, { workflow, projectId, snapshotId }) {
        commit('setActiveProjectId', projectId);
        commit('workflow/setActiveWorkflow', {
            ...workflow,
            projectId
        }, { root: true });

        commit('workflow/setActiveSnapshotId', snapshotId, { root: true });

        
        // TODO: remove this 'root' fallback after mocks have been adjusted
        let workflowId = workflow.info.containerId || 'root';
        addEventListener('WorkflowChanged', { projectId, workflowId, snapshotId });
    },
    unloadActiveWorkflow({ commit, rootState }, { clearWorkflow }) {
        let activeWorkflow = rootState.workflow.activeWorkflow;

        // nothing to do (no tabs open)
        if (!activeWorkflow) {
            return;
        }
        
        // clean up
        let { projectId } = activeWorkflow;
        let { activeSnapshotId: snapshotId } = rootState.workflow;
        let workflowId = rootState.workflow.activeWorkflow.info.containerId;

        removeEventListener('WorkflowChanged', { projectId, workflowId, snapshotId });
       
        commit('selection/clearSelection', null, { root: true });
        commit('workflow/setTooltip', null, { root: true });
        
        if (clearWorkflow) {
            commit('workflow/setActiveWorkflow', null, { root: true });
        }
    },
    saveCanvasState({ rootGetters, commit, rootState }) {
        const { info: { containerId: workflow }, projectId: project } = rootState.workflow?.activeWorkflow;

        const scrollState = rootGetters['canvas/getCanvasScrollState']();

        commit('setSavedCanvasStates', { ...scrollState, project, workflow });
    },
    restoreCanvasState({ dispatch, getters }) {
        const { workflowCanvasState } = getters;
        
        if (workflowCanvasState) {
            dispatch('canvas/restoreScrollState', workflowCanvasState, { root: true });
        }
    },
    removeCanvasState({ rootState, state }) {
        const { info: { containerId: workflow }, projectId: project } = rootState.workflow?.activeWorkflow;
        const stateKey = getCanvasStateKey({ workflow, project });
        delete state.savedCanvasStates[stateKey];
    }
};

export const getters = {
    searchAllPortTypes({ availablePortTypes }) {
        let allTypeIds = Object.keys(availablePortTypes);
        return makeTypeSearch({ typeIds: allTypeIds, installedPortTypes: availablePortTypes });
    },
    
    activeProjectName({ openProjects, activeProjectId }) {
        if (!activeProjectId) {
            return null;
        }
        return openProjects.find(project => project.projectId === activeProjectId).name;
    },

    workflowCanvasState({ savedCanvasStates }, _, { workflow }) {
        const { info: { containerId: workflowId }, projectId } = workflow?.activeWorkflow;

        const savedStateKey = getCanvasStateKey({ workflow: workflowId, project: projectId });
        return savedCanvasStates[savedStateKey];
    }
};
