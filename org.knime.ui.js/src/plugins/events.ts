import { API } from "@api";

import { fetchUiStrings } from "@/components/kai/useKaiServer";
import { useSelectionEvents } from "@/components/uiExtensions/common/useSelectionEvents";
import {
  type AiAssistantEvent,
  useAIAssistantStore,
} from "@/store/aiAssistant";
import { useApplicationStore } from "@/store/application/application";
import { useCanvasStateTrackingStore } from "@/store/application/canvasStateTracking";
import { useDirtyProjectsTrackingStore } from "@/store/application/dirtyProjectsTracking";
import { useGlobalLoaderStore } from "@/store/application/globalLoader";
import { useLifecycleStore } from "@/store/application/lifecycle";
import { useWorkflowPreviewSnapshotsStore } from "@/store/application/workflowPreviewSnapshots";
import { useCanvasStore } from "@/store/canvas";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { useWorkflowMonitorStore } from "@/store/workflowMonitor/workflowMonitor";
import { nodeSize } from "@/style/shapes";
import { notifyPatch } from "@/util/event-syncer";

import { $bus } from "./event-bus";
import type { PluginInitFunction } from "./types";

const init: PluginInitFunction = ({ $router, $toast }) => {
  API.event.registerEventHandlers({
    /**
     * Is a generic event, that holds multiple events (names separated by ':')
     * Calls all event handlers with their params
     */
    // @ts-expect-error
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

      // needs to happen before 'replaceApplicationState'
      if (appState.spaceProviders) {
        try {
          const { failedProviderIds } =
            await useSpaceProvidersStore().setAllSpaceProviders(
              appState.spaceProviders,
            );

          if (failedProviderIds.length > 0) {
            const providerNames = failedProviderIds
              // @ts-expect-error
              .map((id) => `- ${appState.spaceProviders[id].name}`)
              .join("\n");

            $toast.show({
              type: "error",
              headline: "Failed loading spaces",
              message: `Could not load spaces for:\n${providerNames}`,
            });
          }
        } catch (error) {
          consola.error(
            "events::SpaceProvidersChangedEvent -> unexpected error",
            { error },
          );
        }
      }

      useApplicationStore().replaceApplicationState(appState);
      if (appState.openProjects) {
        useLifecycleStore().setActiveProject({ $router });
      }

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
    async SaveAndCloseProjectsEvent({ projectIds }) {
      consola.info("events::SaveAndCloseProjectsEvent", { projectIds });

      useGlobalLoaderStore().updateGlobalLoader({
        loading: true,
      });

      const resolveSnapshot = async (
        projectId: string,
        activeProjectId: string | undefined,
      ): Promise<string | null> => {
        try {
          return projectId === activeProjectId
            ? await useWorkflowPreviewSnapshotsStore().getActiveWorkflowSnapshot()
            : useWorkflowPreviewSnapshotsStore().getRootWorkflowSnapshotByProjectId(
                { projectId },
              );
        } catch (error) {
          consola.error(
            "SaveAndCloseProjectsEvent:: Error resolving workflow SVG snapshot",
            error,
          );
          // null values will trigger a validation on the BE which will cause
          // a warning to be shown to the user
          return null;
        }
      };

      const activeProjectId = useWorkflowStore().activeWorkflow?.projectId;

      const svgSnapshotResolvePromises = projectIds.map((projectId) =>
        resolveSnapshot(projectId, activeProjectId),
      );

      try {
        const svgSnapshots = await Promise.all(svgSnapshotResolvePromises);
        const totalProjects = projectIds.length;

        await API.desktop.saveAndCloseProjects({
          totalProjects,
          projectIds,
          svgSnapshots,
        });
      } catch (error) {
        consola.error(
          "SaveAndCloseProjectsEvent:: Error calling API.desktop.saveAndCloseProjects",
          error,
        );

        // if BE fails we're back in control in the UI, so we should remove the
        // loader overlay which blocks user interaction
        useGlobalLoaderStore().updateGlobalLoader({
          loading: false,
        });

        $toast.show({
          headline: "Error saving your work",
          type: "error",
          message:
            "There was a problem saving one of the workflows. Try again or save them individually.",
        });
      }

      try {
        for (const closingProjectId of projectIds) {
          useCanvasStateTrackingStore().removeCanvasState(closingProjectId);

          useWorkflowPreviewSnapshotsStore().removeFromRootWorkflowSnapshots({
            projectId: closingProjectId,
          });
        }
      } catch (error) {
        // since this event fires when the user is either shutting down the AP or
        // switching perspective then this error is not super relevant since
        // will only cause a bit of extra data leftover which will be cleaned up
        // anyway after the app is shutdown
        consola.error(
          "SaveAndCloseProjectsEvent:: Error tearing down canvas or workflow snapshot state",
          {
            error,
          },
        );
      }
    },

    ImportURIEvent({ x, y }) {
      consola.info("events::ImportURIEvent", { x, y });

      const el = document.elementFromPoint(x, y);
      const kanvas = useCanvasStore().getScrollContainerElement();

      if (kanvas && kanvas.contains(el)) {
        const [canvasX, canvasY] = useCanvasStore().screenToCanvasCoordinates([
          x,
          y,
        ]);

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
