import { fetchApplicationState, addEventListener, removeEventListener, loadWorkflow } from '@api';
import { encodeString } from '@/util/encodeString';
import { APP_ROUTES } from '@/router';

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
    hasNodeRecommendationsEnabled: false,

    // Map that keeps track of root workflow snapshots. Used to generate SVGs when saving
    rootWorkflowSnapshots: new Map(),

    isLoadingWorkflow: false,

    isBusy: false,
    /* Object containing available updates */
    availableUpdates: null,

    /*
     * If true, the node repository will be filtered to show only the nodes that fit the current filter.
     * This will have an effect on the node search, on the category groups, and on the node recommendations.
     */
    nodeRepoFilterEnabled: false
});

export const mutations = {
    setIsBusy(state, value) {
        state.isBusy = value;
    },
    setIsLoadingWorkflow(state, value) {
        state.isLoadingWorkflow = value;
    },
    setActiveProjectId(state, projectId) {
        state.activeProjectId = projectId;
    },
    setOpenProjects(state, projects) {
        state.openProjects = projects.map(({ activeWorkflow, ...rest }) => rest);
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
    },
    setAvailableUpdates(state, availableUpdates) {
        state.availableUpdates = availableUpdates;
    },
    setNodeRepoFilterEnabled(state, nodeRepoFilterEnabled) {
        state.nodeRepoFilterEnabled = nodeRepoFilterEnabled;
    }
};

export const actions = {
    /*
     *   A P P L I C A T I O N   L I F E C Y C L E
     */
    async initializeApplication({ dispatch }, { $router }) {
        await addEventListener('AppStateChanged');

        const applicationState = await fetchApplicationState();
        await dispatch('replaceApplicationState', applicationState);
        
        $router.beforeEach(async (to, from, next) => {
            if (to.params.skipGuards) {
                next();
                return;
            }

            const isLeavingWorkflow = from.name === APP_ROUTES.WorkflowPage;
            const isEnteringWorkflow = to.name === APP_ROUTES.WorkflowPage;
        
            if (isLeavingWorkflow && !isEnteringWorkflow) {
                await dispatch('switchWorkflow', { newWorkflow: null });
                next();
                return;
            }

            if (isEnteringWorkflow) {
                // switchWorkflow will call `next` on its own via the `navigateToWorkflow` parameter
                await dispatch('switchWorkflow', { newWorkflow: to.params, navigateToWorkflow: next });
                return;
            }
        
            next();
        });
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
        if (typeof applicationState.nodeRepoFilterEnabled !== 'undefined') {
            commit('setNodeRepoFilterEnabled', applicationState.nodeRepoFilterEnabled);
            // TODO should we force the update from here or somewhere else?
            dispatch(
                'nodeRepository/setIncludeAllAndSearchNodes',
                !applicationState.nodeRepoFilterEnabled,
                { root: true }
            );
            commit('nodeRepository/setNodesPerCategories', { groupedNodes: [], append: false }, { root: true });
        }
    },
    async setActiveProject({ commit, dispatch, state }, openProjects) {
        if (openProjects.length === 0) {
            consola.info('No workflows opened');
            await dispatch('switchWorkflow', { newWorkflow: null });
            return;
        }
        
        const activeProject = openProjects.find(item => item.activeWorkflow);
        
        if (!activeProject) {
            consola.info('No active workflow provided');

            // chose root workflow of first tab
            const [firstProject] = openProjects;
            await dispatch('loadWorkflow', {
                projectId: firstProject.projectId,
                // ATTENTION: we can only open tabs, that have root workflows (no standalone metanodes or components)
                workflowId: 'root'
            });
            return;
        }
        
        const isSameActiveProject = state?.activeProjectId === activeProject.projectId;
        if (isSameActiveProject) {
            // don't set the workflow if already on it. e.g another tab was closed
            // and we receive an update for `openProjects`
            return;
        }

        const stateKey = getCanvasStateKey(`${activeProject.projectId}--${'root'}`);
        const hasSavedState = Boolean(state.savedCanvasStates[stateKey]);
        const lastActiveWorkflow = state.savedCanvasStates[stateKey]?.lastActive;
        if (hasSavedState && lastActiveWorkflow !== 'root') {
            dispatch('loadWorkflow', { projectId: activeProject.projectId, workflowId: lastActiveWorkflow });
            return;
        }

        await dispatch('setWorkflow', {
            projectId: activeProject.projectId,
            workflow: activeProject.activeWorkflow.workflow,
            snapshotId: activeProject.activeWorkflow.snapshotId
        });
    },

    /*
     *   W O R K F L O W   L I F E C Y C L E
     */

    async switchWorkflow({ commit, dispatch, rootState, state }, { newWorkflow = null, navigateToWorkflow }) {
        const isChangingProject = rootState.workflow?.activeWorkflow?.projectId !== newWorkflow?.projectId;
        await dispatch('updatePreviewSnapshot', { isChangingProject, newWorkflow });

        if (rootState.workflow?.activeWorkflow) {
            commit('setIsLoadingWorkflow', true);
            dispatch('saveCanvasState');

            // unload current workflow
            dispatch('unloadActiveWorkflow', { clearWorkflow: !newWorkflow });
            commit('setActiveProjectId', null);
        }
        
        // only continue if the new workflow exists
        if (newWorkflow) {
            let { projectId, workflowId = 'root' } = newWorkflow;

            // check if project is being changed and if there is already active workflow
            if (isChangingProject) {
                const stateKey = getCanvasStateKey(`${projectId}--${workflowId}`);
                const newWorkflowId = state.savedCanvasStates[stateKey]?.lastActive;

                await dispatch('loadWorkflow', { projectId, workflowId: newWorkflowId, navigateToWorkflow });
            } else {
                await dispatch('loadWorkflow', { projectId, workflowId, navigateToWorkflow });
            }
        }
        
        commit('setIsLoadingWorkflow', false);
    },
    async loadWorkflow({ commit, rootState, dispatch }, { projectId, workflowId = 'root', navigateToWorkflow }) {
        const project = await loadWorkflow({ projectId, workflowId });
        if (project) {
            dispatch('setWorkflow', {
                projectId,
                workflow: project.workflow,
                snapshotId: project.snapshotId,
                navigateToWorkflow
            });
        } else {
            throw new Error(`Workflow not found: "${projectId}" > "${workflowId}"`);
        }
    },
    async setWorkflow({ commit, dispatch }, { workflow, projectId, snapshotId, navigateToWorkflow }) {
        commit('setActiveProjectId', projectId);
        commit('workflow/setActiveWorkflow', {
            ...workflow,
            projectId
        }, { root: true });

        commit('workflow/setActiveSnapshotId', snapshotId, { root: true });

        // TODO: remove this 'root' fallback after mocks have been adjusted
        const workflowId = workflow.info.containerId || 'root';
        addEventListener('WorkflowChanged', { projectId, workflowId, snapshotId });
        
        // Call navigate to workflow function (if provided) before restoring the canvas state
        navigateToWorkflow?.();

        // restore scroll and zoom if saved before
        await dispatch('restoreCanvasState');
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
    
    async restoreCanvasState({ dispatch, getters }) {
        const { workflowCanvasState } = getters;

        if (workflowCanvasState) {
            await dispatch('canvas/restoreScrollState', workflowCanvasState, { root: true });
        }
    },
    
    removeCanvasState({ rootState, state }, projectId) {
        const { info: { containerId: workflow } } = rootState.workflow.activeWorkflow;
        const rootWorkflowId = getRootWorkflowId(workflow);
        const stateKey = getCanvasStateKey(`${projectId}--${rootWorkflowId}`);

        delete state.savedCanvasStates[stateKey];
    },
    
    updatePreviewSnapshot({ rootState, state, dispatch }, { isChangingProject, newWorkflow }) {
        const isCurrentlyOnRoot = rootState.workflow?.activeWorkflow?.info.containerId === 'root';
        const isWorkflowUnsaved = rootState.workflow?.activeWorkflow?.dirty;

        const { activeProjectId } = state;

        // Going from the root into deeper levels (e.g into a Metanode or Component)
        // without having changed projects
        const isEnteringSubWorkflow = isCurrentlyOnRoot && newWorkflow && !isChangingProject;

        if (isEnteringSubWorkflow || (isChangingProject && isWorkflowUnsaved)) {
            const canvasElement = rootState.canvas.getScrollContainerElement().firstChild;

            // save a snapshot of the current state of the root workflow
            dispatch('addToRootWorkflowSnapshots', {
                projectId: activeProjectId,
                element: canvasElement
            });

            return;
        }
        
        // Going back to the root of a workflow without having changed projects
        const isGoingBackToRoot = newWorkflow?.workflowId === 'root';
        if (!isCurrentlyOnRoot && isGoingBackToRoot && !isChangingProject) {
            // Since we're back in the root workflow, we can clear the previously saved snapshot
            dispatch('removeFromRootWorkflowSnapshots', { projectId: activeProjectId });
        }
    },
    
    addToRootWorkflowSnapshots({ state }, { projectId, element }) {
        // always use the "root" workflow
        const snapshotKey = encodeString(`${projectId}--root`);
        state.rootWorkflowSnapshots.set(snapshotKey, element.cloneNode(true));
    },

    removeFromRootWorkflowSnapshots({ state }, { projectId }) {
        state.rootWorkflowSnapshots.delete(encodeString(`${projectId}--root`));
    },

    getRootWorkflowSnapshotByProjectId({ state }, { projectId }) {
        const snapshotKey = encodeString(`${projectId}--root`);
        return state.rootWorkflowSnapshots.get(snapshotKey);
    },

    async getActiveWorkflowSnapshot({ rootState, dispatch }) {
        const { getScrollContainerElement } = rootState.canvas;
        const { activeWorkflow: { projectId, info: { containerId } } } = rootState.workflow;
        
        const isRootWorkflow = containerId === 'root';

        const rootWorkflowSnapshotElement = isRootWorkflow
            ? getScrollContainerElement().firstChild
            : await dispatch('getRootWorkflowSnapshotByProjectId', { projectId });

        return rootWorkflowSnapshotElement;
    },

    toggleContextMenu({
        state,
        commit,
        dispatch,
        rootGetters,
        rootState
    }, {
        event,
        deselectAllObjects = false
    }) {
        // close other menus if they are open
        if (rootState.workflow.quickAddNodeMenu.isOpen) {
            rootState.workflow.quickAddNodeMenu.events['menu-close']?.();
        }
        if (rootState.workflow.portTypeMenu.isOpen) {
            rootState.workflow.portTypeMenu.events['menu-close']?.();
        }

        // close an open menu
        if (state.contextMenu.isOpen) {
            // when closing an active menu, we could optionally receive a native event
            // e.g. the menu is getting closed by right-clicking again
            event?.preventDefault();
            commit('setContextMenu', { isOpen: false, position: null });
            return;
        }

        // safety check
        if (!event) {
            return;
        }

        // we do not want it to bubble up if we handle it here
        event.stopPropagation();
        event.preventDefault();

        if (deselectAllObjects) {
            dispatch('selection/deselectAllObjects', null, { root: true });
        }

        const { clientX, clientY } = event;
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
