import { fetchApplicationState, addEventListener, removeEventListener, loadWorkflow } from '@api';
import { encodeString } from '@/util/encodeString';

const getCanvasStateKey = (input) => encodeString(input);
const getRootWorkflowId = (workflowId) => workflowId.split(':')[0];

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
    hasClipboardSupport: false,

    contextMenu: {
        isOpen: false,
        position: null
    },

    /* Indicates whether node recommendations are available or not */
    hasNodeRecommendationsEnabled: false
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
        const { savedCanvasStates } = state;
        const { workflow, project } = newStates;
        const rootWorkflowId = getRootWorkflowId(workflow);
        const isRootWorkflow = rootWorkflowId === workflow;
        const emptyParentState = { children: {} };
        
        if (isRootWorkflow) {
            const newStateKey = getCanvasStateKey(`${project}--${workflow}`);
            // get a reference of an existing parent state or create new one
            const parentState = savedCanvasStates[newStateKey] || emptyParentState;
            parentState.lastActive = workflow;

            state.savedCanvasStates[newStateKey] = {
                ...parentState,
                ...newStates
            };
        } else {
            const parentStateKey = getCanvasStateKey(`${project}--${rootWorkflowId}`);
            const newStateKey = getCanvasStateKey(`${workflow}`);
            // in case we directly access a child the parent would not exist, so we default to an empty one
            const parentState = savedCanvasStates[parentStateKey] || emptyParentState;

            state.savedCanvasStates[parentStateKey] = {
                // keep the parent state
                ...parentState,
                lastActive: workflow,
                children: {
                    // update the children with the newStates
                    ...parentState.children,
                    [newStateKey]: newStates
                }
            };
        }
    },
    setHasClipboardSupport(state, hasClipboardSupport) {
        state.hasClipboardSupport = hasClipboardSupport;
    },
    setFeatureFlags(state, featureFlags) {
        state.featureFlags = featureFlags;
    },
    setContextMenu(state, value) {
        state.contextMenu = value;
    },
    setHasNodeRecommendationsEnabled(state, hasNodeRecommendationsEnabled) {
        state.hasNodeRecommendationsEnabled = hasNodeRecommendationsEnabled;
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

    // ----------------------------------------------------------------------------------------- //

    async replaceApplicationState({ commit, dispatch, state }, applicationState) {
        // Only set application state properties present in the received object
        if (applicationState.availablePortTypes) {
            commit('setAvailablePortTypes', applicationState.availablePortTypes);
        }
        if (applicationState.suggestedPortTypeIds) {
            commit('setSuggestedPortTypes', applicationState.suggestedPortTypeIds);
        }
        if (applicationState.hasNodeRecommendationsEnabled) {
            commit('setHasNodeRecommendationsEnabled', applicationState.hasNodeRecommendationsEnabled);
        }
        if (applicationState.featureFlags) {
            commit('setFeatureFlags', applicationState.featureFlags);
        }
        if (applicationState.openProjects) {
            commit('setOpenProjects', applicationState.openProjects);
            await dispatch('setActiveProject', applicationState.openProjects);
        }
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

    async switchWorkflow({ commit, dispatch, rootState, state }, newWorkflow) {
        const isChangingProject = rootState.workflow?.activeWorkflow?.projectId !== newWorkflow?.projectId;

        if (rootState.workflow?.activeWorkflow) {
            dispatch('saveCanvasState');

            // unload current workflow
            dispatch('unloadActiveWorkflow', { clearWorkflow: !newWorkflow });
            commit('setActiveProjectId', null);
        }

        // only continue if the new workflow exists
        if (newWorkflow) {
            let { projectId, workflowId = 'root' } = newWorkflow;

            // check if project is being changed and if there is already active workflow
            if (isChangingProject && rootState.workflow?.activeWorkflow) {
                const stateKey = getCanvasStateKey(`${projectId}--${workflowId}`);
                const newWorkflowId = state.savedCanvasStates[stateKey]?.lastActive;

                await dispatch('loadWorkflow', { projectId, workflowId: newWorkflowId });
            } else {
                await dispatch('loadWorkflow', { projectId, workflowId });
            }
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
    setWorkflow({ commit, dispatch }, { workflow, projectId, snapshotId }) {
        commit('setActiveProjectId', projectId);
        commit('workflow/setActiveWorkflow', {
            ...workflow,
            projectId
        }, { root: true });

        commit('workflow/setActiveSnapshotId', snapshotId, { root: true });

        
        // TODO: remove this 'root' fallback after mocks have been adjusted
        let workflowId = workflow.info.containerId || 'root';
        addEventListener('WorkflowChanged', { projectId, workflowId, snapshotId });

        // restore scroll and zoom if saved before
        dispatch('restoreCanvasState');
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
        const { info: { containerId: workflow }, projectId: project } = rootState.workflow.activeWorkflow;

        const scrollState = rootGetters['canvas/getCanvasScrollState']();

        commit('setSavedCanvasStates', { ...scrollState, project, workflow });
    },
    restoreCanvasState({ dispatch, getters }) {
        const { workflowCanvasState } = getters;
        
        if (workflowCanvasState) {
            dispatch('canvas/restoreScrollState', workflowCanvasState, { root: true });
        }
    },
    removeCanvasState({ rootState, state }, projectId) {
        const { info: { containerId: workflow } } = rootState.workflow.activeWorkflow;
        const rootWorkflowId = getRootWorkflowId(workflow);
        const stateKey = getCanvasStateKey(`${projectId}--${rootWorkflowId}`);

        delete state.savedCanvasStates[stateKey];
    },
    toggleContextMenu({ state, commit, rootGetters }, contextMenuEvent) {
        if (state.contextMenu.isOpen) {
            // when closing an active menu, we could optionally receive a native event
            // e.g the menu is getting closed by right-clicking again
            contextMenuEvent?.preventDefault();
            commit('setContextMenu', { isOpen: false, position: null });
            return;
        }

        // if source element has the following class set, then just let the event do the natural behavior
        if (contextMenuEvent.srcElement.classList.contains('native-context-menu')) {
            return;
        }

        // safety check
        if (!contextMenuEvent) {
            return;
        }

        contextMenuEvent.preventDefault();
        const { clientX, clientY } = contextMenuEvent;
        const screenToCanvasCoordinates = rootGetters['canvas/screenToCanvasCoordinates'];
        const [x, y] = screenToCanvasCoordinates([clientX, clientY]);
        state.contextMenu = {
            isOpen: true,
            position: { x, y }
        };
    }
};

export const getters = {
    activeProjectName({ openProjects, activeProjectId }) {
        if (!activeProjectId) {
            return null;
        }
        return openProjects.find(project => project.projectId === activeProjectId).name;
    },

    workflowCanvasState({ savedCanvasStates }, _, { workflow }) {
        const { info: { containerId: workflowId }, projectId } = workflow.activeWorkflow;
        const rootWorkflowId = getRootWorkflowId(workflowId);
        const isRootWorkflow = rootWorkflowId === workflowId;
        const parentStateKey = getCanvasStateKey(`${projectId}--${rootWorkflowId}`);

        if (isRootWorkflow) {
            // read parent state
            return savedCanvasStates[parentStateKey];
        } else {
            // read child state
            const savedStateKey = getCanvasStateKey(workflowId);
            
            return savedCanvasStates[parentStateKey]?.children[savedStateKey];
        }
    }
};
