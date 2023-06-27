import type { ActionTree, GetterTree, MutationTree } from "vuex";

import { API } from "@api";
import { APP_ROUTES } from "@/router/appRoutes";
import { encodeString } from "@/util/encodeString";

import type { RootStoreState } from "../types";
import type { ApplicationState } from "./index";

const getCanvasStateKey = (input: string) => encodeString(input);

interface State {
  /**
   * Tracks loading state while switching workflows
   */
  isLoadingWorkflow: boolean;
}

declare module "./index" {
  interface ApplicationState extends State {}
}

export const state = (): State => ({
  isLoadingWorkflow: false,
});

export const mutations: MutationTree<ApplicationState> = {
  setIsLoadingWorkflow(state, value) {
    state.isLoadingWorkflow = value;
  },
};

export const actions: ActionTree<ApplicationState, RootStoreState> = {
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
        dispatch("nodeRepository/closeDescriptionPanel", null, { root: true });
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
    await dispatch("spaces/loadLocalSpace", {}, { root: true });
    await dispatch("spaces/fetchAllSpaceProviders", {}, { root: true });
  },

  destroyApplication({ dispatch }) {
    API.event.unsubscribeEventListener({ typeId: "AppStateChangedEventType" });
    dispatch("unloadActiveWorkflow", { clearWorkflow: true });
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
};

export const getters: GetterTree<ApplicationState, RootStoreState> = {};
