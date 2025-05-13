/* eslint-disable no-undefined */
import { API } from "@api";
import { defineStore } from "pinia";
import { type Router } from "vue-router";

import { setupHints } from "@knime/components";
import { CURRENT_STATE_VERSION } from "@knime/hub-features/versions";
import { sleep } from "@knime/utils";

import {
  AppState,
  type Workflow,
  type WorkflowSnapshot,
} from "@/api/gateway-api/generated-api";
import { fetchUiStrings as kaiFetchUiStrings } from "@/components/kai/useKaiServer";
import { resourceLocationResolver } from "@/components/uiExtensions/common/useResourceLocation";
import { isDesktop, runInEnvironment } from "@/environment";
import { getHintConfiguration } from "@/hints/hints.config";
import { APP_ROUTES } from "@/router/appRoutes";
import { usePanelStore } from "@/store/panel";
import { useSelectionStore } from "@/store/selection";
import { ratioToZoomLevel, useSettingsStore } from "@/store/settings";
import { useAnnotationInteractionsStore } from "@/store/workflow/annotationInteractions";
import { useComponentInteractionsStore } from "@/store/workflow/componentInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { encodeString } from "@/util/encodeString";
import { geometry } from "@/util/geometry";
import { useCanvasAnchoredComponentsStore } from "../canvasAnchoredComponents/canvasAnchoredComponents";
import { useSpaceProvidersStore } from "../spaces/providers";

import { useApplicationStore } from "./application";
import { useCanvasModesStore } from "./canvasModes";
import { useCanvasStateTrackingStore } from "./canvasStateTracking";
import { lifecycleBus } from "./lifecycle-events";
import { useApplicationSettingsStore } from "./settings";
import { useWorkflowPreviewSnapshotsStore } from "./workflowPreviewSnapshots";

const getCanvasStateKey = (input: string) => encodeString(input);

export class ProjectActivationError extends Error {}
export class ProjectDataLoadError extends Error {
  context: Error;
  constructor(_context: Error) {
    super(_context.message);
    this.context = _context;
  }
}

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

      await API.desktop.waitForDesktopAPI();

      // Fetch ui-settings from backend
      await useSettingsStore().fetchSettings();

      await runInEnvironment({
        DESKTOP: () => {
          consola.trace("lifecycle::setting zoom level");
          API.desktop.setZoomLevel(
            ratioToZoomLevel(useSettingsStore().settings.uiScale),
          );
        },
      });

      // On desktop, the application state will load rather quickly, so we don't
      // need to set this
      runInEnvironment({ BROWSER: () => this.setIsLoadingApp(true) });

      await this.populateHelpMenuAndExamples();

      // Subscribe to update available event
      await runInEnvironment({
        DESKTOP: () =>
          API.event
            .subscribeEvent({ typeId: "UpdateAvailableEventType" })
            .then(() => API.desktop.checkForUpdates())
            .catch((error) => {
              consola.error("lifecycle::Error checking for updates", error);
            }),
      });

      $router.beforeEach(async (to, from, next) => {
        const isLeavingWorkflow = from.name === APP_ROUTES.WorkflowPage;
        const isEnteringWorkflow = to.name === APP_ROUTES.WorkflowPage;

        consola.trace("lifecycle::route middleware", { to, from });

        if (isLeavingWorkflow) {
          // before leaving a workflow check attempt to auto-apply pending
          // node configuration changes (if any)
          const { wasAborted } = await useSelectionStore().deselectAllObjects();

          if (wasAborted) {
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

        type WorkflowNavigationParams = {
          projectId: string;
          workflowId?: string;
          version?: string | null;
        };

        if (isEnteringWorkflow) {
          // when entering workflow, we must dispatch to the store and load
          // the relevant workflow state
          const newWorkflow = {
            ...to.query,
            ...to.params,
          } as WorkflowNavigationParams;
          try {
            await this.switchWorkflow({ newWorkflow });
            next();
            return;
          } catch (error) {
            // for this type of error, the navigation can continue
            // since the error will be displayed on the workflow page
            if (error instanceof ProjectDataLoadError) {
              next();
              return;
            }

            // for other errors simply navigate back to the previous page
            const previousWorkflow =
              "projectId" in from.params
                ? ({
                    ...from.query,
                    ...from.params,
                  } as WorkflowNavigationParams)
                : null;

            await this.switchWorkflow({ newWorkflow: previousWorkflow }).catch(
              (error) => {
                consola.error(
                  "lifecycle::navigation - Unexpected error during navigation recovery",
                  error,
                );
                next({ name: APP_ROUTES.Home.GetStarted });
              },
            );
            next(from);
            return;
          }
        }

        next();
      });

      const applicationState = await API.application.getState({});
      await API.event.subscribeEvent({ typeId: "AppStateChangedEventType" });

      // needs to be done before 'replaceApplicationState'
      if (applicationState.spaceProviders) {
        useSpaceProvidersStore().setAllSpaceProviders(
          applicationState.spaceProviders,
        );
      }

      consola.info("lifecycle::Application state", { applicationState });
      useApplicationStore().replaceApplicationState(applicationState);
      await this.setActiveProject({ $router });

      if (useApplicationSettingsStore().isKaiEnabled) {
        kaiFetchUiStrings();
      }

      this.initializeHints();
    },

    async destroyApplication() {
      consola.trace("lifecycle::destroyApplication");
      await API.event.unsubscribeEventListener({
        typeId: "AppStateChangedEventType",
      });
      await this.unloadActiveWorkflow({ clearWorkflow: true });
    },

    populateHelpMenuAndExamples() {
      return runInEnvironment({
        DESKTOP: () => {
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

          return Promise.all([
            populateCustomMenuEntries,
            populateExampleProjects,
          ]);
        },
      });
    },

    initializeHints() {
      runInEnvironment({
        // setup hints for desktop and use the url for videos unchanged
        DESKTOP: () => {
          window.localStorage.removeItem("onboarding.hints.user");
          setupHints({
            hints: getHintConfiguration((url) => url),

            getRemoteHintState: (storageKey: string) =>
              API.desktop.getUserProfilePart({ key: `${storageKey}.user` }),
            setRemoteHintState: (storageKey: string, currentState) =>
              API.desktop
                .setUserProfilePart({
                  // TODO NXT-3396: supply complete key
                  key: `${storageKey}.user`,
                  data: currentState,
                })
                .then(() => true)
                .catch(() => false),
          });
        },

        // setup hints for browser and use the url for videos based on the resource
        // location resolver
        BROWSER: () => {
          if (
            useApplicationStore().appMode === AppState.AppModeEnum.JobViewer
          ) {
            setupHints({ hints: {} });
            return;
          }

          // to resolve urls in browser, the application state has to be
          // initialized so that we can use the activeProjectId
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
        },
      });
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
        // don't set navigate to project/workflow if already on it. e.g. another tab was closed
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

    /**
     * W O R K F L O W   L I F E C Y C L E
     */
    async switchWorkflow({
      newWorkflow = null,
    }: {
      newWorkflow: {
        projectId: string;
        workflowId?: string;
        version?: string | null;
      } | null;
    }) {
      consola.trace("action::switchWorkflow >> Params", { newWorkflow });

      const activeWorkflow = useWorkflowStore()?.activeWorkflow;
      const isChangingProject =
        activeWorkflow?.projectId !== newWorkflow?.projectId;

      // no previews for the browser
      if (isDesktop()) {
        await useWorkflowPreviewSnapshotsStore().updatePreviewSnapshot({
          isChangingProject,
          newWorkflow,
        });
      }

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
      await sleep(RENDER_DELAY_MS);

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
            versionId: newWorkflow.version,
          });
        } else {
          await this.loadWorkflow({
            projectId,
            workflowId,
            // When not switching projects, the version is kept the same
            // if another one is not explicitly requested (e.g. opening components/metanodes)
            versionId:
              newWorkflow.version === undefined
                ? activeWorkflow?.info.version
                : newWorkflow.version,
          });
        }
      }

      this.setIsLoadingWorkflow(false);
    },

    async loadWorkflow({
      projectId,
      workflowId = "root",
      versionId = null,
    }: {
      projectId: string;
      workflowId?: string;
      versionId?: string | null;
    }) {
      const isLoadingRootWorkflow = workflowId === "root";

      if (isLoadingRootWorkflow && isDesktop()) {
        // ensures that the workflow is loaded on the java-side (only necessary for the desktop AP)
        const projectActivationError = new ProjectActivationError(
          `Failed to set active project ${projectId}`,
        );
        try {
          const isProjectLoadedInAppState =
            await API.desktop.setProjectActiveAndEnsureItsLoaded({
              projectId,
              versionId: versionId ?? CURRENT_STATE_VERSION,
            });

          if (!isProjectLoadedInAppState) {
            throw projectActivationError;
          }
        } catch (_error) {
          throw projectActivationError;
        }
      }
      const getWorkflowParams: Parameters<typeof API.workflow.getWorkflow>[0] =
        {
          projectId,
          workflowId,
          versionId: versionId ?? CURRENT_STATE_VERSION,
          includeInteractionInfo: true,
        };

      let project: WorkflowSnapshot;

      try {
        project = await API.workflow.getWorkflow(getWorkflowParams);
      } catch (error) {
        consola.error("lifecycle::loadWorkflow failed to load workflow", {
          error,
        });

        useWorkflowStore().setWorkflowLoadingError(error as Error);
        throw new ProjectDataLoadError(error as Error);
      }

      if (!project) {
        const error = new Error(
          `Workflow not found: "${projectId}" > "${workflowId}"`,
        );

        useWorkflowStore().setWorkflowLoadingError(error);
        throw new ProjectDataLoadError(error);
      }

      const { workflow, snapshotId } = project;
      this.beforeSetActivateWorkflow({ workflow });

      this.setWorkflow({
        projectId,
        workflow,
        snapshotId,
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
      snapshotId?: string;
    }) {
      useApplicationStore().setActiveProjectId(projectId);
      useWorkflowStore().setActiveWorkflow({
        ...workflow,
        projectId,
      });

      useWorkflowStore().setActiveSnapshotId(snapshotId ?? null);
      const workflowId = workflow.info.containerId;

      if (snapshotId) {
        API.event.subscribeEvent({
          typeId: "WorkflowChangedEventType",
          projectId,
          workflowId,
          snapshotId,
        });
      }
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

      useWorkflowStore().setTooltip(null);

      if (clearWorkflow) {
        useWorkflowStore().setActiveWorkflow(null);
      }

      if (snapshotId) {
        // only unsubscribe if previously subscribed
        try {
          await API.event.unsubscribeEventListener({
            typeId: "WorkflowChangedEventType",
            projectId,
            workflowId,
            snapshotId,
          });
        } catch (error) {
          consola.error(
            "lifecycle::unloadActiveWorkflow failed to unsubscribe to WorkflowChangedEvent",
            { error, projectId, workflowId, snapshotId },
          );
        }
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
