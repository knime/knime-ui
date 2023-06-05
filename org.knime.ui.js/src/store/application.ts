import { API } from "@api";
import { encodeString } from "@/util/encodeString";
import { APP_ROUTES } from "@/router/appRoutes";
import { getNextProjectId } from "./workflow/util";

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
    position: null,
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
  hasNodeCollectionActive: null,

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
  devMode: false,

  /**
   * an object that maps supported file extensions to their node template id
   */
  fileExtensionToNodeTemplateId: {},

  /**
   * an object that maps projectIds to the isDirty flag of the workflow
   */
  dirtyProjectsMap: {},
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
    const rootWorkflowId = "root";
    const isRootWorkflow = rootWorkflowId === workflow;
    const emptyParentState = { children: {} };

    if (isRootWorkflow) {
      const newStateKey = getCanvasStateKey(`${project}--${workflow}`);
      // get a reference of an existing parent state or create new one
      const parentState = savedCanvasStates[newStateKey] || emptyParentState;
      parentState.lastActive = workflow;

      state.savedCanvasStates[newStateKey] = {
        ...parentState,
        ...newStates,
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
          [newStateKey]: newStates,
        },
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
  },
  setFileExtensionToNodeTemplateId(state, fileExtensionToNodeTemplateId) {
    state.fileExtensionToNodeTemplateId = fileExtensionToNodeTemplateId;
  },
  setDirtyProjectsMap(state, dirtyProjectsMap) {
    state.dirtyProjectsMap = dirtyProjectsMap;
  },
};

export const actions = {
  /*
   *   A P P L I C A T I O N   L I F E C Y C L E
   */
  async initializeApplication({ dispatch }, { $router }) {
    await API.event.subscribeEvent({ typeId: "AppStateChangedEventType" });

    $router.beforeEach(async (to, from, next) => {
      const isLeavingWorkflow = from.name === APP_ROUTES.WorkflowPage;
      const isEnteringWorkflow = to.name === APP_ROUTES.WorkflowPage;

      if (isLeavingWorkflow) {
        // TODO: move all this logic to a specific action
        // clear any open menus when leaving a workflow
        await dispatch("toggleContextMenu");
        dispatch("workflow/setEditableAnnotationId", null, { root: true });
      }

      if (isLeavingWorkflow && !isEnteringWorkflow) {
        // when leaving workflow we should dispatch to the store to run the switching logic
        // before destroying the route (aka navigating away)
        await dispatch("switchWorkflow", { newWorkflow: null });
        next();
        return;
      }

      if (isEnteringWorkflow) {
        // when entering workflow, we must navigate to the route before we dispatch
        // to the store and load all the relevant workflow state
        next();
        await dispatch("switchWorkflow", { newWorkflow: to.params });
        return;
      }

      next();
    });

    const applicationState = await API.application.getState({});
    await dispatch("replaceApplicationState", applicationState);
    await dispatch("setActiveProject", { $router });
    await dispatch("spaces/fetchAllSpaceProviders", {}, { root: true });
  },
  destroyApplication({ dispatch }) {
    API.event.unsubscribeEventListener({ typeId: "AppStateChangedEventType" });
    dispatch("unloadActiveWorkflow", { clearWorkflow: true });
  },

  async forceCloseProjects({ state }, { projectIds }) {
    const { openProjects, activeProjectId } = state;
    const nextProjectId = getNextProjectId({
      openProjects,
      activeProjectId,
      closingProjectIds: projectIds,
    });
    await API.desktop.forceCloseWorkflows({ projectIds });

    return nextProjectId;
  },

  // ----------------------------------------------------------------------------------------- //

  replaceApplicationState({ commit, dispatch, state }, applicationState) {
    // Only set application state properties present in the received object
    if (applicationState.availablePortTypes) {
      commit("setAvailablePortTypes", applicationState.availablePortTypes);
    }

    if (applicationState.suggestedPortTypeIds) {
      commit("setSuggestedPortTypes", applicationState.suggestedPortTypeIds);
    }

    // Note: since it's a boolean value, a truthy check won't work because the `false` value won't be set
    if (applicationState.hasNodeRecommendationsEnabled) {
      commit(
        "setHasNodeRecommendationsEnabled",
        applicationState.hasNodeRecommendationsEnabled
      );
    }

    if (applicationState.featureFlags) {
      commit("setFeatureFlags", applicationState.featureFlags);
    }

    if (applicationState.openProjects) {
      commit("setOpenProjects", applicationState.openProjects);
      dispatch(
        "spaces/syncPathWithOpenProjects",
        { openProjects: applicationState.openProjects },
        { root: true }
      );
    }

    if (applicationState.exampleProjects) {
      commit("setExampleProjects", applicationState.exampleProjects);
    }

    // Note: since it's a boolean value, a truthy check won't work because the `false` value won't be set
    if (applicationState.hasOwnProperty("scrollToZoomEnabled")) {
      commit("setScrollToZoomEnabled", applicationState.scrollToZoomEnabled);
    }

    // Note: since it's a boolean value, a truthy check won't work because the `false` value won't be set
    if (applicationState.hasOwnProperty("hasNodeCollectionActive")) {
      const currentValue = state.hasNodeCollectionActive;

      // we always set the state to init the value based on the saved user preference
      commit(
        "setHasNodeCollectionActive",
        applicationState.hasNodeCollectionActive
      );

      if (
        currentValue !== null &&
        currentValue !== applicationState.hasNodeCollectionActive
      ) {
        // only fetch when the value has actually changed
        dispatch("nodeRepository/resetSearchAndCategories", {}, { root: true });
      }
    }

    // Note: since it's a boolean value, a truthy check won't work because the `false` value won't be set
    if (applicationState.hasOwnProperty("devMode")) {
      commit("setDevMode", applicationState.devMode);
    }

    if (applicationState.fileExtensionToNodeTemplateId) {
      commit(
        "setFileExtensionToNodeTemplateId",
        applicationState.fileExtensionToNodeTemplateId
      );
    }
  },

  async setActiveProject({ state }, { $router }) {
    const { openProjects } = state;
    if (openProjects.length === 0) {
      consola.info("No workflows opened");
      await $router.push({ name: APP_ROUTES.EntryPage.GetStartedPage });
      return;
    }

    const activeProject = openProjects.find((item) => item.activeWorkflowId);

    // No active project is set -> stay on entry page (aka: null project)
    if (!activeProject) {
      await $router.push({ name: APP_ROUTES.EntryPage.GetStartedPage });
      return;
    }

    const isSameActiveProject =
      state?.activeProjectId === activeProject.projectId;
    if (isSameActiveProject) {
      // don't set navigate to project/workflow if already on it. e.g another tab was closed
      // and we receive an update for `openProjects`
      return;
    }

    await $router.push({
      name: APP_ROUTES.WorkflowPage,
      params: {
        projectId: activeProject.projectId,
        workflowId: activeProject.activeWorkflowId,
      },
      force: true,
    });
  },

  /*
   *   W O R K F L O W   L I F E C Y C L E
   */

  async switchWorkflow(
    { commit, dispatch, rootState, state },
    { newWorkflow = null }
  ) {
    const isChangingProject =
      rootState.workflow?.activeWorkflow?.projectId !== newWorkflow?.projectId;
    await dispatch("updatePreviewSnapshot", { isChangingProject, newWorkflow });

    commit("setIsLoadingWorkflow", true);
    if (rootState.workflow?.activeWorkflow) {
      dispatch("saveCanvasState");

      // unload current workflow
      dispatch("unloadActiveWorkflow", { clearWorkflow: !newWorkflow });
      commit("setActiveProjectId", null);
    }

    // only continue if the new workflow exists
    if (newWorkflow) {
      const { projectId, workflowId = "root" } = newWorkflow;

      // check if project is being changed and if there is already active workflow
      if (isChangingProject) {
        const stateKey = getCanvasStateKey(`${projectId}--${workflowId}`);
        const newWorkflowId = state.savedCanvasStates[stateKey]?.lastActive;

        await dispatch("loadWorkflow", {
          projectId,
          workflowId: newWorkflowId,
        });
      } else {
        await dispatch("loadWorkflow", { projectId, workflowId });
      }
    }

    commit("setIsLoadingWorkflow", false);
  },
  async loadWorkflow({ dispatch }, { projectId, workflowId = "root" }) {
    // ensures that the workflow is loaded on the java-side (only necessary for the desktop AP)
    API.desktop.setProjectActiveAndEnsureItsLoaded({ projectId });
    const project = await API.workflow.getWorkflow({
      projectId,
      workflowId,
      includeInteractionInfo: true,
    });
    if (project) {
      dispatch("setWorkflow", {
        projectId,
        workflow: project.workflow,
        snapshotId: project.snapshotId,
      });
    } else {
      throw new Error(`Workflow not found: "${projectId}" > "${workflowId}"`);
    }
  },
  async setWorkflow({ commit, dispatch }, { workflow, projectId, snapshotId }) {
    commit("setActiveProjectId", projectId);
    commit(
      "workflow/setActiveWorkflow",
      {
        ...workflow,
        projectId,
      },
      { root: true }
    );

    commit("workflow/setActiveSnapshotId", snapshotId, { root: true });

    // TODO: remove this 'root' fallback after mocks have been adjusted
    const workflowId = workflow.info.containerId || "root";
    API.event.subscribeEvent({
      typeId: "WorkflowChangedEventType",
      projectId,
      workflowId,
      snapshotId,
    });

    // restore scroll and zoom if saved before
    await dispatch("restoreCanvasState");
  },
  unloadActiveWorkflow({ commit, rootState }, { clearWorkflow }) {
    const activeWorkflow = rootState.workflow.activeWorkflow;

    // nothing to do (no tabs open)
    if (!activeWorkflow) {
      return;
    }

    // clean up
    const { projectId } = activeWorkflow;
    const { activeSnapshotId: snapshotId } = rootState.workflow;
    const workflowId = rootState.workflow.activeWorkflow.info.containerId;

    API.event.unsubscribeEventListener({
      typeId: "WorkflowChangedEventType",
      projectId,
      workflowId,
      snapshotId,
    });

    commit("selection/clearSelection", null, { root: true });
    commit("workflow/setTooltip", null, { root: true });

    if (clearWorkflow) {
      commit("workflow/setActiveWorkflow", null, { root: true });
    }
  },
  saveCanvasState({ rootGetters, commit, rootState }) {
    const {
      info: { containerId: workflow },
      projectId: project,
    } = rootState.workflow.activeWorkflow;

    const scrollState = rootGetters["canvas/getCanvasScrollState"]();

    commit("setSavedCanvasStates", { ...scrollState, project, workflow });
  },

  async restoreCanvasState({ dispatch, getters }) {
    const { workflowCanvasState } = getters;

    if (workflowCanvasState) {
      await dispatch("canvas/restoreScrollState", workflowCanvasState, {
        root: true,
      });
    }
  },

  removeCanvasState({ state }, projectId) {
    const stateKey = getCanvasStateKey(`${projectId}--root`);

    delete state.savedCanvasStates[stateKey];
  },

  updatePreviewSnapshot(
    { rootState, state, dispatch },
    { isChangingProject, newWorkflow }
  ) {
    const isCurrentlyOnRoot =
      rootState.workflow?.activeWorkflow?.info.containerId === "root";
    const isWorkflowUnsaved = rootState.workflow?.activeWorkflow?.dirty;

    const { activeProjectId } = state;

    // Going from the root into deeper levels (e.g into a Metanode or Component)
    // without having changed projects
    const isEnteringSubWorkflow =
      isCurrentlyOnRoot && newWorkflow && !isChangingProject;

    // eslint-disable-next-line @typescript-eslint/no-extra-parens
    if (isEnteringSubWorkflow || (isChangingProject && isWorkflowUnsaved)) {
      const canvasElement =
        rootState.canvas.getScrollContainerElement().firstChild;

      // save a snapshot of the current state of the root workflow
      dispatch("addToRootWorkflowSnapshots", {
        projectId: activeProjectId,
        element: canvasElement,
        isCanvasEmpty: rootState.canvas.isEmpty,
      });

      return;
    }

    // Going back to the root of a workflow without having changed projects
    const isGoingBackToRoot = newWorkflow?.workflowId === "root";
    if (!isCurrentlyOnRoot && isGoingBackToRoot && !isChangingProject) {
      // Since we're back in the root workflow, we can clear the previously saved snapshot
      dispatch("removeFromRootWorkflowSnapshots", {
        projectId: activeProjectId,
      });
    }
  },

  addToRootWorkflowSnapshots({ state }, { projectId, element, isCanvasEmpty }) {
    // always use the "root" workflow
    const snapshotKey = encodeString(`${projectId}--root`);
    state.rootWorkflowSnapshots.set(snapshotKey, {
      svgElement: element.cloneNode(true),
      isCanvasEmpty,
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
    const {
      activeWorkflow: {
        projectId,
        info: { containerId },
      },
    } = rootState.workflow;

    const isRootWorkflow = containerId === "root";

    const rootWorkflowSnapshot = isRootWorkflow
      ? {
          svgElement: getScrollContainerElement().firstChild,
          isCanvasEmpty: isEmpty,
        }
      : // when we're on a nested workflow (metanode/component) we then need to use the saved snapshot
        await dispatch("getRootWorkflowSnapshotByProjectId", { projectId });

    return rootWorkflowSnapshot;
  },

  toggleContextMenu(
    { state, commit, dispatch, rootGetters, rootState },
    { event = null, deselectAllObjects = false } = {}
  ) {
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
      commit("setContextMenu", { isOpen: false, position: null });
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
      dispatch("selection/deselectAllObjects", null, { root: true });
    }

    const { clientX, clientY } = event;
    const screenToCanvasCoordinates =
      rootGetters["canvas/screenToCanvasCoordinates"];
    const [x, y] = screenToCanvasCoordinates([clientX, clientY]);
    state.contextMenu = {
      isOpen: true,
      position: { x, y },
    };
  },

  updateGlobalLoader({ state }, { loading, text, config }) {
    state.globalLoader = {
      loading,
      text,
      config: config || { displayMode: "fullscreen" },
    };
  },

  setDirtyProjectsMap({ commit }, dirtyProjectsMap) {
    commit("setDirtyProjectsMap", dirtyProjectsMap);
  },

  updateDirtyProjectsMap({ state, commit }, dirtyProjectsMap) {
    const updatedDirtyProjectsMap = {
      ...state.dirtyProjectsMap,
      ...dirtyProjectsMap,
    };
    commit("setDirtyProjectsMap", updatedDirtyProjectsMap);
  },
};

export const getters = {
  activeProjectName({ openProjects, activeProjectId }) {
    if (!activeProjectId) {
      return null;
    }
    return openProjects.find((project) => project.projectId === activeProjectId)
      .name;
  },

  workflowCanvasState({ savedCanvasStates }, _, { workflow }) {
    if (!workflow.activeWorkflow) {
      return null;
    }

    const {
      info: { containerId: workflowId },
      projectId,
    } = workflow.activeWorkflow;
    const rootWorkflowId = "root";
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
  },
};
