import type { Store } from "vuex";

import { API } from "@/api";
import { fetchUiStrings } from "@/components/kai/useKaiServer";
import { useSelectionEvents } from "@/components/uiExtensions/common/useSelectionEvents";
import type { RootStoreState } from "@/store/types";
import { nodeSize } from "@/style/shapes";
import { notifyPatch } from "@/util/event-syncer";

import { $bus } from "./event-bus";
import type { PluginInitFunction } from "./types";

const init: PluginInitFunction = ({ $store, $router, $toast }) => {
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
      $store.dispatch("workflow/patch.apply", ops);

      if (snapshotId) {
        notifyPatch(snapshotId);
      }
    },

    /**
     * Is triggered by the backend, whenever a new state update of the workflow monitor is made
     * Sends a list of json-patch operations to update the frontend's state
     */
    async WorkflowMonitorStateChangeEvent({ patch }) {
      consola.info("events::WorkflowMonitorStateChangeEvent", { patch });

      if (!$store.state.workflowMonitor.isActive) {
        // ignore events that could be lagging behind and are not needed anymore
        return;
      }

      const ops = patch?.ops ?? [];

      // for all patch ops rewrite their path such that they are applied to the 'currentState' property
      ops.forEach((op) => {
        op.path = `/currentState${op.path}`;
      });

      await $store.dispatch("workflowMonitor/patch.apply", ops);
      $store.dispatch("workflowMonitor/ProjectDirtyStateEvent");
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
        $store.dispatch("application/setDirtyProjectsMap", dirtyProjectsMap);
      } else {
        $store.dispatch("application/updateDirtyProjectsMap", dirtyProjectsMap);
      }
    },

    /**
     * Is triggered by the backend, whenever the application state changes
     * sends the new state
     */
    AppStateChangedEvent({ appState }) {
      consola.info("events::AppStateChangedEvent", { appState });

      $store.dispatch("application/replaceApplicationState", appState);
      if (appState.openProjects) {
        $store.dispatch("application/setActiveProject", { $router });
      }

      // In case a `SaveAndCloseProjectsEvent` was received before, which might've triggered
      // an `AppStateChangedEvent` later, then we make sure to clean up the busy state here
      $store.dispatch("application/updateGlobalLoader", { loading: false });
    },

    // Is triggered by the backend, whenever there are AP updates available
    UpdateAvailableEvent({ newReleases, bugfixes }) {
      consola.info("events::UpdateAvailableEvent", { newReleases, bugfixes });

      if (newReleases || bugfixes) {
        $store.commit("application/setAvailableUpdates", {
          newReleases,
          bugfixes,
        });
      }
    },

    // Sends a progress information about node repository being loaded
    NodeRepositoryLoadingProgressEvent({ progress, extensionName }) {
      $store.commit("application/setNodeRepositoryLoadingProgress", {
        progress,
        extensionName,
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

    ProviderResourceChangedEvent(event) {
      consola.info("<<< events::ProviderResourceChangedEvent", event);
    },
  });

  API.desktop.registerEventHandlers({
    async SaveAndCloseProjectsEvent({ projectIds }) {
      consola.info("events::SaveAndCloseProjectsEvent", { projectIds });

      await $store.dispatch("application/updateGlobalLoader", {
        loading: true,
      });

      const resolveSnapshot = async (
        $store: Store<RootStoreState>,
        projectId: string,
        activeProjectId: string | undefined,
      ): Promise<string | null> => {
        try {
          return projectId === activeProjectId
            ? await $store.dispatch("application/getActiveWorkflowSnapshot")
            : await $store.dispatch(
                "application/getRootWorkflowSnapshotByProjectId",
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

      const activeProjectId = $store.state.workflow.activeWorkflow?.projectId;

      const svgSnapshotResolvePromises = projectIds.map((projectId) =>
        resolveSnapshot($store, projectId, activeProjectId),
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
        await $store.dispatch("application/updateGlobalLoader", {
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
          await $store.dispatch(
            "application/removeCanvasState",
            closingProjectId,
            { root: true },
          );

          await $store.dispatch(
            "application/removeFromRootWorkflowSnapshots",
            { projectId: closingProjectId },
            { root: true },
          );
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
      const kanvas = $store.state.canvas.getScrollContainerElement();

      if (kanvas && kanvas.contains(el)) {
        const [canvasX, canvasY] = $store.getters[
          "canvas/screenToCanvasCoordinates"
        ]([x, y]);

        const workflow = $store.state.workflow.activeWorkflow;

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
      $store.dispatch("application/updateGlobalLoader", {
        loading: isLoading,
        displayMode: "floating",
        loadingMode: "normal",
        text,
      });
    },

    // Is triggered by the backend, e.g. when an answer is received from the AI Assistant
    AiAssistantEvent({ chainType, data }) {
      consola.info("events::AiAssistantEvent", { chainType, data });

      $store.dispatch("aiAssistant/handleAiAssistantEvent", {
        chainType,
        data,
      });
    },

    AiAssistantServerChangedEvent() {
      consola.info("events::AiAssistantServerChangedEvent");

      $store.dispatch("aiAssistant/getHubID");
      fetchUiStrings();
    },

    DesktopAPIFunctionResultEvent(payload) {
      // forward to app local event bus, handled in desktop-api promise
      $bus.emit(`desktop-api-function-result-${payload.name}`, payload);
    },

    async SpaceProvidersChangedEvent(payload) {
      consola.info("events::SpaceProvidersChangedEvent", payload);

      if ("error" in payload) {
        consola.error("Error fetching space providers", payload.error);

        $store.commit("spaces/setIsLoadingProviders", false);
        $store.commit("setHasLoadedProviders", false);
        return;
      }

      try {
        const { failedProviderIds } = (await $store.dispatch(
          "spaces/setAllSpaceProviders",
          payload.result,
        )) as { successfulProviderIds: string[]; failedProviderIds: string[] };

        if (failedProviderIds.length > 0) {
          const providerNames = failedProviderIds
            .map((id) => `- ${payload.result[id].name}`)
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
    },
  });
};

export default init;
