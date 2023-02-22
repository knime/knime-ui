import { fetchApplicationState, addEventListener, removeEventListener, loadWorkflow,
    setProjectActiveAndEnsureItsLoadedInBackend } from '@api';
import { encodeString } from '@/util/encodeString';
import { APP_ROUTES } from '@/router';

const getCanvasStateKey = (input) => encodeString(input);

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

    globalLoader: { loading: false },

    /* Object containing available updates */
    availableUpdates: null,

    /*
     * If true, a node collection is configured on the preference page. The node search will show the nodes of the
     * collection first and the category groups and node recommendations will only show nodes from the collection.
     */
    hasNodeCollectionActive: false,

    /**
     * If true, the mouse wheel should be used for zooming instead of scrolling
     */
    scrollToZoomEnabled: false,

    /**
     * example projects with name, svg and origin
     */
    exampleProjects: [],

    /*
     * If true, dev mode specifics buttons will be shown.
     */
    devMode: false
});

export const mutations = {
    setIsLoadingWorkflow(state, value) {
        state.isLoadingWorkflow = value;
    },
    setActiveProjectId(state, projectId) {
        state.activeProjectId = projectId;
    },
    setOpenProjects(state, projects) {
        state.openProjects = projects;
    },
    setExampleProjects(state, examples) {
        state.exampleProjects = examples;
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
        const rootWorkflowId = 'root';
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
    setScrollToZoomEnabled(state, scrollToZoomEnabled) {
        state.scrollToZoomEnabled = scrollToZoomEnabled;
    },
    setHasNodeCollectionActive(state, hasNodeCollectionActive) {
        state.hasNodeCollectionActive = hasNodeCollectionActive;
    },
    setDevMode(state, devMode) {
        state.devMode = devMode;
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
        await dispatch('spaces/fetchAllSpaceProviders', {}, { root: true });

        $router.beforeEach(async (to, from, next) => {
            if (to.query.skipGuards === 'true') {
                next();
                return;
            }

            const isLeavingWorkflow = from.name === APP_ROUTES.WorkflowPage;
            const isEnteringWorkflow = to.name === APP_ROUTES.WorkflowPage;

            if (isLeavingWorkflow) {
                // clear any open menus when leaving a workflow
                await dispatch('toggleContextMenu');
            }

            if (isLeavingWorkflow && !isEnteringWorkflow) {
                await dispatch('switchWorkflow', { newWorkflow: null });
                next();
                return;
            }

            if (isEnteringWorkflow) {
                // wrap next in a promise to make sure navigation happens at the right time and the workflow
                // route page is rendered before the dispatch to the store (switchWorkflow) finishes, not after
                const navigateToWorkflow = () => new Promise(resolve => {
                    next();
                    setTimeout(resolve, 0);
                });
                // switchWorkflow will call `next` on its own via the `navigateToWorkflow` parameter
                await dispatch('switchWorkflow', { newWorkflow: to.params, navigateToWorkflow });
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

    async replaceApplicationState({ commit, dispatch, state, rootState }, applicationState) {
        // Only set application state properties present in the received object
        if (applicationState.availablePortTypes) {
            commit('setAvailablePortTypes', applicationState.availablePortTypes);
        }

        if (applicationState.suggestedPortTypeIds) {
            commit('setSuggestedPortTypes', applicationState.suggestedPortTypeIds);
        }

        // Note: since it's a boolean value, a truthy check won't work because the `false` value won't be set
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

        if (applicationState.exampleProjects) {
            commit('setExampleProjects', applicationState.exampleProjects);
        }

        // Note: since it's a boolean value, a truthy check won't work because the `false` value won't be set
        if (applicationState.hasOwnProperty('scrollToZoomEnabled')) {
            commit('setScrollToZoomEnabled', applicationState.scrollToZoomEnabled);
        }

        // Note: since it's a boolean value, a truthy check won't work because the `false` value won't be set
        if (applicationState.hasOwnProperty('hasNodeCollectionActive')) {
            commit('setHasNodeCollectionActive', applicationState.hasNodeCollectionActive);
            dispatch('nodeRepository/resetSearchAndCategories', {}, { root: true });
        }

        // Note: since it's a boolean value, a truthy check won't work because the `false` value won't be set
        if (applicationState.hasOwnProperty('devMode')) {
            commit('setDevMode', applicationState.devMode);
        }
    },
    async setActiveProject({ commit, dispatch, state }, openProjects) {
        if (openProjects.length === 0) {
            consola.info('No workflows opened');
            await dispatch('switchWorkflow', { newWorkflow: null });
            return;
        }

        const activeProject = openProjects.find(item => item.activeWorkflowId);

        // No active project is set -> stay on entry page (aka: null project)
        if (!activeProject) {
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

        // Before opening a new workflow we need to make sure we update the preview snapshot of the one
        // we're leaving
        await dispatch('updatePreviewSnapshot', {
            isChangingProject: true,
            newWorkflow: {
                projectId: activeProject.projectId,
                workflowId: 'root'
            }
        });

        await dispatch('loadWorkflow',
            { projectId: activeProject.projectId, workflowId: activeProject.activeWorkflowId });
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
        // ensures that the workflow is loaded on the java-side (only necessary for the desktop AP)
        setProjectActiveAndEnsureItsLoadedInBackend({ projectId });
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
        await navigateToWorkflow?.();

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
        // console.log('HEREEEE')
        const { workflowCanvasState } = getters;

        if (workflowCanvasState) {
            await dispatch('canvas/restoreScrollState', workflowCanvasState, { root: true });
        }
    },

    removeCanvasState({ rootState, state }, projectId) {
        const stateKey = getCanvasStateKey(`${projectId}--root`);

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
                element: canvasElement,
                isCanvasEmpty: rootState.canvas.isEmpty
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

    addToRootWorkflowSnapshots({ state }, { projectId, element, isCanvasEmpty }) {
        // always use the "root" workflow
        const snapshotKey = encodeString(`${projectId}--root`);
        state.rootWorkflowSnapshots.set(snapshotKey, {
            svgElement: element.cloneNode(true),
            isCanvasEmpty
        });
    },

    removeFromRootWorkflowSnapshots({ state }, { projectId }) {
        state.rootWorkflowSnapshots.delete(encodeString(`${projectId}--root`));
    },

    getRootWorkflowSnapshotByProjectId({ state }, { projectId }) {
        const snapshotKey = encodeString(`${projectId}--root`);
        return state.rootWorkflowSnapshots.get(snapshotKey);
    },

    async getActiveWorkflowSnapshot({ rootState, dispatch }) {
        const { getScrollContainerElement, isEmpty } = rootState.canvas;
        const { activeWorkflow: { projectId, info: { containerId } } } = rootState.workflow;

        const isRootWorkflow = containerId === 'root';

        const rootWorkflowSnapshot = isRootWorkflow
            ? { svgElement: getScrollContainerElement().firstChild, isCanvasEmpty: isEmpty }
            // when we're on a nested workflow (metanode/component) we then need to use the saved snapshot
            : await dispatch('getRootWorkflowSnapshotByProjectId', { projectId });

        return rootWorkflowSnapshot;
    },

    toggleContextMenu({
        state,
        commit,
        dispatch,
        rootGetters,
        rootState
    }, {
        event = null,
        deselectAllObjects = false
    } = {}) {
        // close other menus if they are open
        if (rootState.workflow.quickAddNodeMenu.isOpen) {
            rootState.workflow.quickAddNodeMenu.events.menuClose?.();
        }
        if (rootState.workflow.portTypeMenu.isOpen) {
            rootState.workflow.portTypeMenu.events.menuClose?.();
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
    },

    updateGlobalLoader({ state }, { loading, text, config }) {
        state.globalLoader = {
            loading,
            text,
            config: config || { displayMode: 'fullscreen' }
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
        const rootWorkflowId = 'root';
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
