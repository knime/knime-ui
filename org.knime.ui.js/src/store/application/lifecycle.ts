import { API } from "@api";
import { defineStore } from "pinia";
import type { Router } from "vue-router";

import { setupHints } from "@knime/components";

import {
  AppState,
  type Workflow,
  type WorkflowSnapshot,
} from "@/api/gateway-api/generated-api";
import { fetchUiStrings as kaiFetchUiStrings } from "@/components/kai/useKaiServer";
import { resourceLocationResolver } from "@/components/uiExtensions/common/useResourceLocation";
import { runInEnvironment } from "@/environment";
import { getHintConfiguration } from "@/hints/hints.config";
import { APP_ROUTES } from "@/router/appRoutes";
import { useNodeConfigurationStore } from "@/store/nodeConfiguration/nodeConfiguration";
import { usePanelStore } from "@/store/panel";
import { useSelectionStore } from "@/store/selection";
import { ratioToZoomLevel, useSettingsStore } from "@/store/settings";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { useAnnotationInteractionsStore } from "@/store/workflow/annotationInteractions";
import { useComponentInteractionsStore } from "@/store/workflow/componentInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { encodeString } from "@/util/encodeString";
import { geometry } from "@/util/geometry";
import { retryAsyncCall } from "@/util/retryAsyncCall";
import { useCanvasAnchoredComponentsStore } from "../canvasAnchoredComponents/canvasAnchoredComponents";

import { useApplicationStore } from "./application";
import { useCanvasModesStore } from "./canvasModes";
import { useCanvasStateTrackingStore } from "./canvasStateTracking";
import { lifecycleBus } from "./lifecycle-events";
import { useApplicationSettingsStore } from "./settings";
import { useWorkflowPreviewSnapshotsStore } from "./workflowPreviewSnapshots";

const getCanvasStateKey = (input: string) => encodeString(input);

type LifecycleState = {
  /**
   * Tracks loading state while switching workflows
   */
  isLoadingWorkflow: boolean;

  isChangingProject: boolean;

  isLoadingApp: boolean;
};

export const useLifecycleStore = defineStore("lifecycle", {
  state: (): LifecycleState => ({
    isLoadingWorkflow: false,
    isChangingProject: false,
    isLoadingApp: false,
  }),
  actions: {
    setIsLoadingWorkflow(isLoadingWorkflow: boolean) {
      this.isLoadingWorkflow = isLoadingWorkflow;
    },

    setIsChangingProject(isChangingProject: boolean) {
      this.isChangingProject = isChangingProject;
    },

    setIsLoadingApp(isLoadingApp: boolean) {
      this.isLoadingApp = isLoadingApp;
    },

    async initializeApplication({ $router }: { $router: Router }) {
      consola.trace("lifecycle::initializeApplication");

      // populate local storage from backend
      await runInEnvironment({
        DESKTOP: async () => {
          consola.trace("lifecycle::getting persisted local storage data");
          const RETRY_DELAY_MS = 50;
          // TODO: NXT-989 remove this delay once desktop calls are made via the
          // EquoComm service
          await retryAsyncCall(
            () =>
              API.desktop
                .getPersistedLocalStorageData()
                .then((localStorageItems) =>
                  Object.entries(localStorageItems ?? {}).forEach(
                    ([key, value]) => {
                      if (Object.keys(value as any).length === 0) {
                        window.localStorage.removeItem(key as string);
                      } else {
                        window.localStorage.setItem(
                          key as string,
                          JSON.stringify(value),
                        );
                      }
                    },
                  ),
                ),
            RETRY_DELAY_MS,
            100,
          );
        },
      });

      // Read settings saved in local storage
      useSettingsStore().fetchSettings();

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
                ratioToZoomLevel(useSettingsStore().settings.uiScale),
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
          this.setIsLoadingApp(true);
        },
      });

      await API.event.subscribeEvent({ typeId: "AppStateChangedEventType" });

      await runInEnvironment({
        DESKTOP: async () => {
          // Get custom help menu entries
          const populateCustomMenuEntries = API.desktop
            .getCustomHelpMenuEntries()
            .then((customHelpMenuEntries) =>
              useApplicationStore().setCustomHelpMenuEntries(
                customHelpMenuEntries ?? {},
              ),
            )
            .catch((error) => {
              consola.error(
                "lifecycle::Error getting custom menu entries",
                error,
              );
            });

          const populateExampleProjects = API.desktop
            .getExampleProjects()
            .then((data) => useApplicationStore().setExampleProjects(data))
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
          const canContinue =
            await useNodeConfigurationStore().autoApplySettings({
              nextNodeId: null,
            });

          if (!canContinue) {
            // cancel the navigation if the user cancelled on the auto-apply prompt
            next(false);
            return;
          }
        }

        if (isLeavingWorkflow && !isEnteringWorkflow) {
          // when leaving workflow we should dispatch to the store to run the switching logic
          // before destroying the route (aka navigating away)
          await this.switchWorkflow({ newWorkflow: null });
          next();
          return;
        }

        if (isEnteringWorkflow) {
          // when entering workflow, we must navigate to the route before we dispatch
          // to the store and load all the relevant workflow state
          next();
          const newWorkflow = to.params as {
            projectId: string;
            workflowId?: string;
          };
          await this.switchWorkflow({ newWorkflow });
          return;
        }

        next();
      });

      const applicationState = await API.application.getState({});
      consola.info("lifecycle::Application state", { applicationState });
      useApplicationStore().replaceApplicationState(applicationState);
      await this.setActiveProject({ $router });

      await runInEnvironment({
        DESKTOP: async () => {
          consola.trace("lifecycle::loading local space");
          await useSpaceProvidersStore().loadLocalSpace();
          consola.trace("lifecycle::fetching all space providers");
          useSpaceProvidersStore().fetchAllSpaceProviders();
        },
      });

      if (useApplicationSettingsStore().isKaiEnabled) {
        kaiFetchUiStrings();
      }

      // setup hints for browser and use the url for videos based on the resource
      // location resolver
      runInEnvironment({
        BROWSER: () => {
          if (
            useApplicationStore().appMode === AppState.AppModeEnum.JobViewer
          ) {
            setupHints({ hints: {} });
          } else {
            // to resolve urls in browser application state to be
            // initialized and use the activeProjectId
            const hintVideoResolver = (url: string) => {
              const activeProject = useApplicationStore().openProjects.find(
                (project) => project.activeWorkflowId,
              );

              if (!activeProject) {
                return "";
              }

              return resourceLocationResolver(
                activeProject.projectId,
                `org/knime/ui/js${url}`,
              );
            };

            setupHints({ hints: getHintConfiguration(hintVideoResolver) });
          }
        },
      });
    },

    destroyApplication() {
      consola.trace("lifecycle::destroyApplication");
      API.event.unsubscribeEventListener({
        typeId: "AppStateChangedEventType",
      });
      this.unloadActiveWorkflow({ clearWorkflow: true });
    },

    async setActiveProject({ $router }: { $router: Router }) {
      const { openProjects } = useApplicationStore();
      consola.trace("action::setActiveProject");

      const goHomeIfNoActiveProject = () => {
        const { currentRoute } = $router;
        if (
          !currentRoute.value.name ||
          currentRoute.value.name === APP_ROUTES.WorkflowPage
        ) {
          $router.push({ name: APP_ROUTES.Home.GetStarted });
        }
      };

      if (openProjects.length === 0) {
        consola.trace("action::setActiveProject -> No workflows opened");
        await runInEnvironment({ DESKTOP: goHomeIfNoActiveProject });

        return;
      }

      const activeProject = openProjects.find((item) => item.activeWorkflowId);

      // No active project is set -> stay on home page (aka: null project)
      if (!activeProject) {
        consola.trace(
          "action::setActiveProject -> No active project set. Redirecting home",
        );
        await runInEnvironment({ DESKTOP: goHomeIfNoActiveProject });
        return;
      }

      const isSameActiveProject =
        useApplicationStore()?.activeProjectId === activeProject.projectId;

      if (isSameActiveProject) {
        // don't set navigate to project/workflow if already on it. e.g another tab was closed
        // and we receive an update for `openProjects`
        return;
      }

      const params = {
        projectId: activeProject.projectId,
        workflowId: activeProject.activeWorkflowId,
      };

      consola.trace(
        "action::setActiveProject -> Navigating to project",
        params,
      );

      await $router.push({
        name: APP_ROUTES.WorkflowPage,
        params,
        force: true,
      });
    },
    /*
     *   W O R K F L O W   L I F E C Y C L E
     */
    async switchWorkflow({
      newWorkflow = null,
    }: {
      newWorkflow: { projectId: string; workflowId?: string } | null;
    }) {
      consola.trace("action::switchWorkflow >> Params", { newWorkflow });

      const isChangingProject =
        useWorkflowStore()?.activeWorkflow?.projectId !==
        newWorkflow?.projectId;

      useWorkflowPreviewSnapshotsStore().updatePreviewSnapshot({
        isChangingProject,
        newWorkflow,
      });

      this.setIsChangingProject(isChangingProject);

      // only activate the app loader if we're going to switch to a workflow; skip it
      // when showing the home page.
      // Also reset the error (if any) but skip for the homepage to avoid flashes of loading state
      if (newWorkflow) {
        useWorkflowStore().setWorkflowLoadingError(null);
        this.setIsLoadingWorkflow(true);
      }

      // small wait time to improve visual feedback of app skeleton loader
      const RENDER_DELAY_MS = 100;
      await new Promise((r) => setTimeout(r, RENDER_DELAY_MS));

      if (useWorkflowStore()?.activeWorkflow) {
        consola.trace(
          "action::switchWorkflow -> saving canvas state and unloading active workflow",
        );

        useCanvasStateTrackingStore().saveCanvasState();
        lifecycleBus.emit("beforeUnloadWorkflow");

        // unload current workflow
        await this.unloadActiveWorkflow({ clearWorkflow: !newWorkflow });
        if (!newWorkflow) {
          useApplicationStore().setActiveProjectId(null);
        }
      }

      // only continue if the new workflow exists
      if (newWorkflow) {
        lifecycleBus.emit("beforeLoadWorkflow");

        const { projectId, workflowId = "root" } = newWorkflow;

        // check if project is being changed and if there is already active workflow
        if (isChangingProject) {
          const stateKey = getCanvasStateKey(`${projectId}--${workflowId}`);
          const newWorkflowId =
            useCanvasStateTrackingStore().savedCanvasStates[stateKey]
              ?.lastActive;

          await this.loadWorkflow({
            projectId,
            workflowId: newWorkflowId,
          });
        } else {
          await this.loadWorkflow({ projectId, workflowId });
        }
      }

      this.setIsLoadingWorkflow(false);
    },

    async loadWorkflow({
      projectId,
      workflowId = "root",
    }: {
      projectId: string;
      workflowId?: string;
    }) {
      // ensures that the workflow is loaded on the java-side (only necessary for the desktop AP)
      await API.desktop.setProjectActiveAndEnsureItsLoaded({ projectId });

      let project: WorkflowSnapshot;
      try {
        project = await API.workflow.getWorkflow({
          projectId,
          workflowId,
          includeInteractionInfo: true,
        });
      } catch (error) {
        consola.error("lifecycle::loadWorkflow failed to load workflow", {
          error,
        });

        useWorkflowStore().setWorkflowLoadingError(error as Error);

        throw error;
      }

      if (!project) {
        const error = new Error(
          `Workflow not found: "${projectId}" > "${workflowId}"`,
        );

        useWorkflowStore().setWorkflowLoadingError(error);

        throw error;
      }

      this.beforeSetActivateWorkflow({ workflow: project.workflow });

      await this.setWorkflow({
        projectId,
        workflow: project.workflow,
        snapshotId: project.snapshotId,
      });

      this.setIsLoadingApp(false);
      this.afterSetActivateWorkflow();
      lifecycleBus.emit("onWorkflowLoaded");
    },

    beforeSetActivateWorkflow({
      workflow,
    }: {
      workflow: WorkflowSnapshot["workflow"];
    }) {
      // calculate and save meta node port bar default bounds, as they become part of the workflow bounds we need to
      // do this very early and only once.
      useWorkflowStore().setCalculatedMetanodePortBarBounds(
        geometry.calculateMetaNodePortBarBounds(workflow),
      );
    },

    setWorkflow({
      workflow,
      projectId,
      snapshotId,
    }: {
      workflow: Workflow;
      projectId: string;
      snapshotId: string;
    }) {
      useApplicationStore().setActiveProjectId(projectId);
      useWorkflowStore().setActiveWorkflow({
        ...workflow,
        projectId,
      });

      useWorkflowStore().setActiveSnapshotId(snapshotId);
      const workflowId = workflow.info.containerId;
      API.event.subscribeEvent({
        typeId: "WorkflowChangedEventType",
        projectId,
        workflowId,
        snapshotId,
      });
    },

    afterSetActivateWorkflow() {
      useComponentInteractionsStore().checkForLinkedComponentUpdates({
        auto: true,
      });
    },

    async unloadActiveWorkflow({ clearWorkflow }: { clearWorkflow: boolean }) {
      const { activeWorkflow } = useWorkflowStore();

      // nothing to do (no tabs open)
      if (!activeWorkflow) {
        return;
      }

      // clean up
      const {
        projectId,
        info: { containerId: workflowId },
      } = activeWorkflow;

      useCanvasModesStore().resetCanvasMode();
      useCanvasAnchoredComponentsStore().closeAllAnchoredMenus();
      useAnnotationInteractionsStore().setEditableAnnotationId("");
      usePanelStore().closeExtensionPanel();
      useComponentInteractionsStore().clearComponentUpdateToasts();

      const { activeSnapshotId: snapshotId } = useWorkflowStore();

      useSelectionStore().clearSelection();
      useWorkflowStore().setTooltip(null);

      if (clearWorkflow) {
        useWorkflowStore().setActiveWorkflow(null);
      }

      try {
        await API.event.unsubscribeEventListener({
          typeId: "WorkflowChangedEventType",
          projectId,
          workflowId,
          snapshotId: snapshotId!,
        });
      } catch (error) {
        consola.error(
          "lifecycle::unloadActiveWorkflow failed to unsubscribe to WorkflowChangedEvent",
          { error },
        );
      }
    },

    async subscribeToNodeRepositoryLoadingEvent() {
      if (!useApplicationStore().nodeRepositoryLoaded) {
        // Call event to start listening to node repository loading progress
        await API.event.subscribeEvent({
          typeId: "NodeRepositoryLoadingProgressEventType",
        });
      }
    },
  },
});
