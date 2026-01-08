import { API } from "@api";

import { fetchUiStrings } from "@/components/kai/useKaiServer";
import { useSelectionEvents } from "@/components/uiExtensions/common/useSelectionEvents";
import { isDesktop } from "@/environment";
import { APP_ROUTES } from "@/router/appRoutes";
import { useAIAssistantStore } from "@/store/ai/aiAssistant";
import type { AiAssistantEvent } from "@/store/ai/types";
import { useApplicationStore } from "@/store/application/application";
import { useDirtyProjectsTrackingStore } from "@/store/application/dirtyProjectsTracking";
import { useGlobalLoaderStore } from "@/store/application/globalLoader";
import { useLifecycleStore } from "@/store/application/lifecycle";
import { useCurrentCanvasStore } from "@/store/canvas/useCurrentCanvasStore";
import { useSpaceCachingStore } from "@/store/spaces/caching";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { useWorkflowMonitorStore } from "@/store/workflowMonitor/workflowMonitor";
import { nodeSize } from "@/style/shapes";
import { notifyPatch } from "@/util/event-syncer";
import { getKanvasDomElement } from "@/util/workflow-canvas";

import { $bus } from "./event-bus";
import type { PluginInitFunction } from "./types";

const init: PluginInitFunction = ({ $router, $toast }) => {
  API.event.registerEventHandlers({
    /**
     * Is a generic event, that holds multiple events (names separated by ':')
     * Calls all event handlers with their params
     */
    // @ts-expect-error (please add error description)
    CompositeEvent({ events, params, eventHandlers }) {
      consola.info("events::CompositeEvent", { events, params });
      (events ?? []).forEach((event, index) => {
        const handler = eventHandlers.get(event);
        if (params[index]) {
          handler(params[index]);
        }
      });
    },

    /**
     * Is triggered by the backend, whenever a change to the workflow has been made/requested
     * Sends a list of json-patch operations to update the frontend's state
     */
    WorkflowChangedEvent({ patch, snapshotId }) {
      consola.info("events::WorkflowChangedEvent", { patch, snapshotId });

      const { ops } = patch;
      // for all patch ops rewrite their path such that they are applied to 'activeWorkflow'
      ops.forEach((op) => {
        op.path = `/activeWorkflow${op.path}`;
      });
      useWorkflowStore()["patch.apply"](ops);

      if (snapshotId) {
        notifyPatch(snapshotId);
      }
    },

    /**
     * Is triggered by the backend, whenever a new state update of the workflow monitor is made
     * Sends a list of json-patch operations to update the frontend's state
     */
    WorkflowMonitorStateChangeEvent({ patch }) {
      consola.info("events::WorkflowMonitorStateChangeEvent", { patch });

      if (!useWorkflowMonitorStore().isActive) {
        // ignore events that could be lagging behind and are not needed anymore
        return;
      }

      const ops = patch?.ops ?? [];

      // for all patch ops rewrite their path such that they are applied to the 'currentState' property
      ops.forEach((op) => {
        op.path = `/currentState${op.path}`;
      });

      useWorkflowMonitorStore()["patch.apply"](ops);
    },

    /**
     * Is triggered by the backend, whenever a change to the workflow has been made/requested or the AppState changes
     * Sends a map with all open project ids and their dirty flag
     */
    ProjectDirtyStateEvent({ dirtyProjectsMap, shouldReplace }) {
      consola.info("events::ProjectDirtyStateEvent", {
        dirtyProjectsMap,
        shouldReplace,
      });

      if (shouldReplace) {
        useDirtyProjectsTrackingStore().dirtyProjectsMap = dirtyProjectsMap!;
      } else {
        useDirtyProjectsTrackingStore().updateDirtyProjectsMap(
          dirtyProjectsMap!,
        );
      }
    },

    /**
     * Is triggered by the backend, whenever the application state changes
     * sends the new state
     */
    // NOSONAR - promise returned not needed to be awaited; there are no direct callers
    async AppStateChangedEvent({ appState }) {
      consola.info("events::AppStateChangedEvent", { appState });

      // TODO: NXT-3464 - remove this check when ticket is done
      if (Object.keys(appState).length === 0) {
        return;
      }

      const incomingProviders = appState.spaceProviders;

      // needs to happen before 'replaceApplicationState'
      if (incomingProviders) {
        const spaceProvidersStore = useSpaceProvidersStore();

        const isOnSpacePages =
          $router.currentRoute.value.name ===
            APP_ROUTES.Home.SpaceBrowsingPage ||
          $router.currentRoute.value.name ===
            APP_ROUTES.Home.SpaceSelectionPage;

        if (isOnSpacePages) {
          const displayedSpaceProviderId = $router.currentRoute.value.params
            .spaceProviderId as string;

          const wasRemoved = !incomingProviders.find(
            ({ id }) => id === displayedSpaceProviderId,
          );

          if (wasRemoved) {
            $router.push({ name: APP_ROUTES.Home.GetStarted });
          }
        }

        // add new incoming providers
        for (const incoming of incomingProviders) {
          const shouldBeAdded =
            !spaceProvidersStore.spaceProviders[incoming.id];

          if (shouldBeAdded) {
            spaceProvidersStore.spaceProviders[incoming.id] = {
              ...incoming,
              spaceGroups: [],
            };
          }
        }

        const currentProviders = Object.values(
          spaceProvidersStore.spaceProviders,
        );

        // remove pre-existing providers that are no longer present
        for (const current of currentProviders) {
          const shouldBeRemoved = !incomingProviders.some(
            ({ id }) => id === current.id,
          );

          if (shouldBeRemoved) {
            delete spaceProvidersStore.spaceProviders[current.id];
          }
        }
      }

      const applicationStore = useApplicationStore();
      applicationStore.replaceApplicationState(appState);

      // setting the active project from the AppState can only happen in desktop.
      // In the browser the user only views a single workflow: the one in their browser tab
      if (appState.openProjects && isDesktop()) {
        const lifecycleStore = useLifecycleStore();

        // there was no explicit user navigation, therefore we should
        // update the active project which will navigate to it
        if (!lifecycleStore.pendingWorkflowNavigation) {
          await lifecycleStore.setActiveProject({ $router });
        }
      }

      useSpaceCachingStore().syncPathWithOpenProjects({
        openProjects: applicationStore.openProjects,
      });

      // In case a `SaveAndCloseProjectsEvent` was received before, which might've triggered
      // an `AppStateChangedEvent` later, then we make sure to clean up the busy state here
      useGlobalLoaderStore().updateGlobalLoader({ loading: false });
    },

    // Is triggered by the backend, whenever there are AP updates available
    UpdateAvailableEvent({ newReleases, bugfixes }) {
      consola.info("events::UpdateAvailableEvent", { newReleases, bugfixes });

      if (newReleases || bugfixes) {
        useApplicationStore().setAvailableUpdates({
          newReleases,
          bugfixes,
        });
      }
    },

    // Sends a progress information about node repository being loaded
    NodeRepositoryLoadingProgressEvent({ progress, extensionName }) {
      useApplicationStore().setNodeRepositoryLoadingProgress({
        progress: progress ?? 0,
        extensionName: extensionName ?? "",
      });
    },

    // Event to show a toast.
    ShowToastEvent(toast) {
      $toast.show(toast);
    },

    ProjectDisposedEvent() {
      consola.info("events::ProjectDisposedEvent");

      $bus.emit("block-ui");

      $toast.show({
        headline: "Session expired",
        message: "Refresh the page to reactivate the session",
        type: "error",
        autoRemove: false,
      });
    },

    SelectionEvent(event) {
      consola.info("events::SelectionEvent", event);

      useSelectionEvents().notifyListeners(event);
    },

    SpaceItemChangedEvent(event) {
      consola.info("<<< events::SpaceItemChangedEvent", event);
    },
  });

  API.desktop.registerEventHandlers({
    ImportURIEvent({ x, y }) {
      consola.info("events::ImportURIEvent", { x, y });

      const el = document.elementFromPoint(x, y);
      const kanvas = getKanvasDomElement();

      if (kanvas?.contains(el)) {
        const [canvasX, canvasY] =
          useCurrentCanvasStore().value.screenToCanvasCoordinates([x, y]);

        const workflow = useWorkflowStore().activeWorkflow;

        API.desktop.importURIAtWorkflowCanvas({
          uri: null,
          projectId: workflow!.projectId,
          workflowId: workflow!.info.containerId,
          x: canvasX - nodeSize / 2,
          y: canvasY - nodeSize / 2,
        });
      }
    },

    // Is triggered by the backend, whenever there are installation or update processes starting
    // or finishing
    SoftwareUpdateProgressEvent({ task, subtask, status, progress }) {
      consola.info("events::SoftwareUpdateProgressEvent", {
        task,
        subtask,
        status,
        progress,
      });

      const isLoading = status !== "Finished";
      const text = `${task}: ${status} (${progress}%)`;

      // TODO: Use progress UI component to display update progress (NXT-2860)
      // As long as we are not FINISHED we will show the loader
      useGlobalLoaderStore().updateGlobalLoader({
        loading: isLoading,
        displayMode: "floating",
        loadingMode: "normal",
        text,
      });
    },

    // Is triggered by the backend, e.g. when an answer is received from the AI Assistant
    AiAssistantEvent({ chainType, data }) {
      consola.info("events::AiAssistantEvent", { chainType, data });

      useAIAssistantStore().handleAiAssistantEvent({
        chainType,
        data: data as AiAssistantEvent,
      });
    },

    AiAssistantServerChangedEvent() {
      consola.info("events::AiAssistantServerChangedEvent");

      useAIAssistantStore().getHubID();
      fetchUiStrings();
    },

    DesktopAPIFunctionResultEvent(payload) {
      // forward to app local event bus, handled in desktop-api promise
      $bus.emit(`desktop-api-function-result-${payload.name}`, payload);
    },
  });
};

export default init;
