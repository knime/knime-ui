import { geometry } from "@/util/geometry";
import type { ActionTree, GetterTree, MutationTree } from "vuex";

import { API } from "@api";
import { APP_ROUTES } from "@/router/appRoutes";
import { encodeString } from "@/util/encodeString";

import type { RootStoreState } from "../types";
import type { ApplicationState } from "./index";
import type { Router } from "vue-router";
import type {
  Workflow,
  WorkflowSnapshot,
} from "@/api/gateway-api/generated-api";
import { runInEnvironment } from "@/environment";

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
  async initializeApplication({ dispatch }, { $router }: { $router: Router }) {
    await API.event.subscribeEvent({ typeId: "AppStateChangedEventType" });
    await runInEnvironment({
      DESKTOP: async () => {
        try {
          await API.event.subscribeEvent({
            typeId: "UpdateAvailableEventType",
          });
          API.desktop.checkForUpdates();
        } catch (error) {
          consola.log(error);
        }
      },
    });

    $router.beforeEach(async (to, from, next) => {
      const isLeavingWorkflow = from.name === APP_ROUTES.WorkflowPage;
      const isEnteringWorkflow = to.name === APP_ROUTES.WorkflowPage;

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

    await dispatch("settings/fetchSettings", {}, { root: true });
    const applicationState = await API.application.getState({});
    await dispatch("replaceApplicationState", applicationState);
    await dispatch("setActiveProject", { $router });
    await runInEnvironment({
      DESKTOP: () =>
        Promise.all([
          dispatch("spaces/loadLocalSpace", {}, { root: true }),
          dispatch("spaces/fetchAllSpaceProviders", {}, { root: true }),
        ]),
    });
  },

  destroyApplication({ dispatch }) {
    API.event.unsubscribeEventListener({ typeId: "AppStateChangedEventType" });
    dispatch("unloadActiveWorkflow", { clearWorkflow: true });
  },

  async setActiveProject({ state }, { $router }: { $router: Router }) {
    const { openProjects } = state;

    if (openProjects.length === 0) {
      consola.info("No workflows opened");
      await runInEnvironment({
        DESKTOP: () =>
          $router.push({ name: APP_ROUTES.EntryPage.GetStartedPage }),
      });
      return;
    }

    const activeProject = openProjects.find((item) => item.activeWorkflowId);

    // No active project is set -> stay on entry page (aka: null project)
    if (!activeProject) {
      await runInEnvironment({
        DESKTOP: () =>
          $router.push({ name: APP_ROUTES.EntryPage.GetStartedPage }),
      });
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
    { newWorkflow = null },
  ) {
    const isChangingProject =
      rootState.workflow?.activeWorkflow?.projectId !== newWorkflow?.projectId;
    await dispatch("updatePreviewSnapshot", { isChangingProject, newWorkflow });

    commit("setIsLoadingWorkflow", true);
    if (rootState.workflow?.activeWorkflow) {
      dispatch("saveCanvasState");

      // unload current workflow
      await dispatch("unloadActiveWorkflow", { clearWorkflow: !newWorkflow });
      if (!newWorkflow) {
        commit("setActiveProjectId", null);
      }
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
    await API.desktop.setProjectActiveAndEnsureItsLoaded({ projectId });

    const project = await API.workflow.getWorkflow({
      projectId,
      workflowId,
      includeInteractionInfo: true,
    });

    if (!project) {
      throw new Error(`Workflow not found: "${projectId}" > "${workflowId}"`);
    }

    await dispatch("beforeSetActivateWorkflow", { workflow: project.workflow });

    await dispatch("setWorkflow", {
      projectId,
      workflow: project.workflow,
      snapshotId: project.snapshotId,
    });

    await dispatch("afterSetActivateWorkflow");
  },

  beforeSetActivateWorkflow(
    { commit },
    { workflow }: { workflow: WorkflowSnapshot["workflow"] },
  ) {
    // calculate and save meta node port bar default bounds, as they become part of the workflow bounds we need to
    // do this very early and only once.
    commit(
      "workflow/setCalculatedMetanodePortBarBounds",
      geometry.calculateMetaNodePortBarBounds(workflow),
      { root: true },
    );
  },

  async setWorkflow(
    { commit, dispatch },
    {
      workflow,
      projectId,
      snapshotId,
    }: { workflow: Workflow; projectId: string; snapshotId: string },
  ) {
    commit("setActiveProjectId", projectId);
    commit(
      "workflow/setActiveWorkflow",
      {
        ...workflow,
        projectId,
      },
      { root: true },
    );

    commit("workflow/setActiveSnapshotId", snapshotId, { root: true });
    const workflowId = workflow.info.containerId;
    API.event.subscribeEvent({
      typeId: "WorkflowChangedEventType",
      projectId,
      workflowId,
      snapshotId,
    });

    // restore scroll and zoom if saved before
    await dispatch("restoreCanvasState");
  },

  afterSetActivateWorkflow({ dispatch }) {
    dispatch(
      "workflow/checkForLinkedComponentUpdates",
      { auto: true },
      { root: true },
    );
  },

  async unloadActiveWorkflow(
    { commit, rootState, dispatch },
    { clearWorkflow },
  ) {
    const { activeWorkflow } = rootState.workflow;

    // nothing to do (no tabs open)
    if (!activeWorkflow) {
      return;
    }

    // clean up
    const {
      projectId,
      info: { containerId: workflowId },
    } = activeWorkflow;

    await dispatch("resetCanvasMode");
    await dispatch("toggleContextMenu");
    dispatch("workflow/setEditableAnnotationId", null, { root: true });
    dispatch("panel/closeExtensionPanel", null, { root: true });
    dispatch("workflow/clearComponentUpdateToasts", null, { root: true });

    const { activeSnapshotId: snapshotId } = rootState.workflow;

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

  async subscribeToNodeRepositoryLoadingEvent({ state }) {
    if (!state.nodeRepositoryLoaded) {
      // Call event to start listening to node repository loading progress
      await API.event.subscribeEvent({
        typeId: "NodeRepositoryLoadingProgressEventType",
      });
    }
  },
};

export const getters: GetterTree<ApplicationState, RootStoreState> = {};
