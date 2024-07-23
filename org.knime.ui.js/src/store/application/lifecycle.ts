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
import { fetchUiStrings as kaiFetchUiStrings } from "@/components/kaiSidebar/useKaiServer";
import { features } from "@/plugins/feature-flags";
import { ratioToZoomLevel } from "@/store/settings";
import { retryAsyncCall } from "@/util/retryAsyncCall";

import { lifecycleBus } from "./lifecycle-events";

const getCanvasStateKey = (input: string) => encodeString(input);

interface State {
  /**
   * Tracks loading state while switching workflows
   */
  isLoadingWorkflow: boolean;

  isChangingProject: boolean;

  isLoadingApp: boolean;
}

declare module "./index" {
  interface ApplicationState extends State {}
}

export const state = (): State => ({
  isLoadingWorkflow: false,
  isChangingProject: false,
  isLoadingApp: false,
});

export const mutations: MutationTree<ApplicationState> = {
  setIsLoadingWorkflow(state, value) {
    state.isLoadingWorkflow = value;
  },
  setIsChangingProject(state, value) {
    state.isChangingProject = value;
  },
  setIsLoadingApp(state, value) {
    state.isLoadingApp = value;
  },
};

export const actions: ActionTree<ApplicationState, RootStoreState> = {
  async initializeApplication(
    { state, rootState, commit, dispatch },
    { $router }: { $router: Router },
  ) {
    consola.trace("lifecycle::initializeApplication");

    // Read settings saved in local storage
    await dispatch("settings/fetchSettings", {}, { root: true });

    // Set zoom level and retry until the 'API.desktop' functions are available
    await runInEnvironment({
      DESKTOP: async () => {
        consola.trace("lifecycle::setting zoom level");
        const RETRY_DELAY_MS = 50;
        // TODO: NXT-989 remove this delay once desktop calls are made via the
        // EquoComm service
        await retryAsyncCall(
          () =>
            API.desktop.setZoomLevel(
              ratioToZoomLevel(rootState.settings.settings.uiScale),
            ),
          RETRY_DELAY_MS,
          100,
        );
      },
    });

    // On desktop, the application state will load rather quickly, so we don't
    // need to set this
    runInEnvironment({
      BROWSER: () => {
        commit("setIsLoadingApp", true);
      },
    });

    await API.event.subscribeEvent({ typeId: "AppStateChangedEventType" });

    await runInEnvironment({
      DESKTOP: async () => {
        // Get custom help menu entries
        const populateCustomMenuEntries = API.desktop
          .getCustomHelpMenuEntries()
          .then((customHelpMenuEntries) =>
            commit("setCustomHelpMenuEntries", customHelpMenuEntries),
          )
          .catch((error) => {
            consola.error(
              "lifecycle::Error getting custom menu entries",
              error,
            );
          });

        const populateExampleProjects = API.desktop
          .getExampleProjects()
          .then((data) => commit("setExampleProjects", data))
          .catch((error) => {
            consola.error("lifecycle::Error getting example projects", error);
          });

        // Subscribe to update available event
        const checkForUpdates = API.event
          .subscribeEvent({ typeId: "UpdateAvailableEventType" })
          .then(() => API.desktop.checkForUpdates())
          .catch((error) => {
            consola.error("lifecycle::Error checking for updates", error);
          });

        await Promise.all([
          populateCustomMenuEntries,
          populateExampleProjects,
          checkForUpdates,
        ]);
      },
    });

    $router.beforeEach(async (to, from, next) => {
      const isLeavingWorkflow = from.name === APP_ROUTES.WorkflowPage;
      const isEnteringWorkflow = to.name === APP_ROUTES.WorkflowPage;

      consola.trace("lifecycle::route middleware", { to, from });

      if (isLeavingWorkflow) {
        // before leaving a workflow check attempt to auto-apply pending
        // node configuration changes (if any)
        const canContinue = await dispatch(
          "nodeConfiguration/autoApplySettings",
          { nextNode: null },
          { root: true },
        );

        if (!canContinue) {
          // cancel the navigation if the user cancelled on the auto-apply prompt
          next(false);
          return;
        }
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
    consola.info("lifecycle::Application state", { applicationState });
    await dispatch("replaceApplicationState", applicationState);
    await dispatch("setActiveProject", { $router });

    await runInEnvironment({
      DESKTOP: async () => {
        consola.trace("lifecycle::loading local space");
        await dispatch("spaces/loadLocalSpace", {}, { root: true });
        consola.trace("lifecycle::fetching all space providers");
        await dispatch("spaces/fetchAllSpaceProviders", {}, { root: true });
      },
    });

    const { isKaiInstalled, isKaiPermitted } = features(state.featureFlags);
    if (isKaiInstalled() && isKaiPermitted()) {
      kaiFetchUiStrings();
    }
  },

  destroyApplication({ dispatch }) {
    consola.trace("lifecycle::destroyApplication");
    API.event.unsubscribeEventListener({ typeId: "AppStateChangedEventType" });
    dispatch("unloadActiveWorkflow", { clearWorkflow: true });
  },

  async setActiveProject({ state }, { $router }: { $router: Router }) {
    consola.trace("action::setActiveProject");
    const { openProjects } = state;

    if (openProjects.length === 0) {
      consola.trace("action::setActiveProject -> No workflows opened");
      await runInEnvironment({
        DESKTOP: () => $router.push({ name: APP_ROUTES.Home.GetStarted }),
      });
      return;
    }

    const activeProject = openProjects.find((item) => item.activeWorkflowId);

    // No active project is set -> stay on home page (aka: null project)
    if (!activeProject) {
      consola.trace(
        "action::setActiveProject -> No active project set. Redirecting home",
      );
      await runInEnvironment({
        DESKTOP: () => $router.push({ name: APP_ROUTES.Home.GetStarted }),
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

    const params = {
      projectId: activeProject.projectId,
      workflowId: activeProject.activeWorkflowId,
    };

    consola.trace("action::setActiveProject -> Navigating to project", params);

    await $router.push({ name: APP_ROUTES.WorkflowPage, params, force: true });
  },
  /*
   *   W O R K F L O W   L I F E C Y C L E
   */
  async switchWorkflow(
    { commit, dispatch, rootState, state },
    { newWorkflow = null },
  ) {
    consola.trace("action::switchWorkflow >> Params", { newWorkflow });

    const isChangingProject =
      rootState.workflow?.activeWorkflow?.projectId !== newWorkflow?.projectId;

    await dispatch("updatePreviewSnapshot", { isChangingProject, newWorkflow });

    commit("setIsChangingProject", isChangingProject);

    // only activate the app loader if we're going to switch to a workflow; skip it
    // when showing the home page
    if (newWorkflow) {
      commit("setIsLoadingWorkflow", true);
    }

    // small wait time to improve visual feedback of app skeleton loader
    const RENDER_DELAY_MS = 100;
    await new Promise((r) => setTimeout(r, RENDER_DELAY_MS));

    if (rootState.workflow?.activeWorkflow) {
      consola.trace(
        "action::switchWorkflow -> saving canvas state and unloading active workflow",
      );

      dispatch("saveCanvasState");
      lifecycleBus.emit("beforeUnloadWorkflow");

      // unload current workflow
      await dispatch("unloadActiveWorkflow", { clearWorkflow: !newWorkflow });
      if (!newWorkflow) {
        commit("setActiveProjectId", null);
      }
    }

    // only continue if the new workflow exists
    if (newWorkflow) {
      lifecycleBus.emit("beforeLoadWorkflow");

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

  async loadWorkflow({ commit, dispatch }, { projectId, workflowId = "root" }) {
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

    commit("setIsLoadingApp", false);
    await dispatch("afterSetActivateWorkflow");
    lifecycleBus.emit("onWorkflowLoaded");
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
      snapshotId: snapshotId!,
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
