import type { Store } from "vuex";
import { API } from "@api";
import { notifyPatch } from "@/util/event-syncer";
import { nodeSize } from "@/style/shapes.mjs";
import type { RootStoreState } from "@/store/types";
import { $bus } from "./event-bus";
import type { PluginInitFunction } from "./types";
import { fetchUiStrings } from "@/components/kaiSidebar/useKaiServer";

const init: PluginInitFunction = ({ $store, $router, $toast }) => {
  API.event.registerEventHandlers({
    /**
     * Is a generic event, that holds multiple events (names separated by ':')
     * Calls all event handlers with their params
     */
    // @ts-expect-error
    CompositeEvent({ events, params, eventHandlers }) {
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
    WorkflowChangedEvent({ patch: { ops }, snapshotId }) {
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
     * Is triggered by the backend, whenever a change to the workflow has been made/requested or the AppState changes
     * Sends a map with all open project ids and their dirty flag
     */
    ProjectDirtyStateEvent({ dirtyProjectsMap, shouldReplace }) {
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
      $store.dispatch("application/updateGlobalLoader", {
        loading: true,
        config: { displayMode: "transparent" },
      });

      $toast.show({
        headline: "Session expired",
        message: "Refresh the page to reactivate the session",
        type: "error",
        autoRemove: false,
        buttons: [
          {
            text: "Refresh page",
            callback: () => {
              window.location.reload();
            },
          },
        ],
      });
    },
  });

  API.desktop.registerEventHandlers({
    async SaveAndCloseProjectsEvent({ projectIds, params = [] }) {
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
          consola.error(error);
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
          // send over any parameters that are sent in the event payload, or empty in case none
          params,
        });
      } catch (error) {
        // if BE fails we're back in control in the UI, so we should remove the
        // loader overlay which blocks user interaction
        await $store.dispatch("application/updateGlobalLoader", {
          loading: false,
        });

        $toast.show({
          headline: "Error saving your work",
          type: "error",
          message:
            "There was a problem saving one of your projects. Please try again or save them individually",
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
        consola.error("Error tearing down canvas or workflow snapshot state", {
          error,
        });
      }
    },

    ImportURIEvent({ x, y }) {
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
    ProgressEvent({ status, text }) {
      const isLoading = status === "STARTED";
      const loaderConfig = isLoading
        ? {
            displayMode: "toast",
            loadingMode: "normal",
          }
        : null;

      $store.dispatch("application/updateGlobalLoader", {
        loading: isLoading,
        config: loaderConfig,
        text,
      });
    },

    // Is triggered by the backend, e.g. when an answer is received from the AI Assistant
    AiAssistantEvent({ chainType, data }) {
      $store.dispatch("aiAssistant/handleAiAssistantEvent", {
        chainType,
        data,
      });
    },

    AiAssistantServerChangedEvent() {
      $store.dispatch("aiAssistant/getHubID");
      fetchUiStrings();
    },

    DesktopAPIFunctionResultEvent(payload) {
      // forward to app local event bus, handled in desktop-api promise
      $bus.emit(`desktop-api-function-result-${payload.name}`, payload.result);
    },

    SpaceProvidersChangedEvent(payload) {
      if ("error" in payload) {
        consola.error("Error fetching space providers", payload.error);

        $store.commit("spaces/setIsLoadingProvider", false);
        $store.commit("setHasLoadedProviders", false);
        return;
      }

      $store.dispatch("spaces/setAllSpaceProviders", payload.result);
    },
  });
};

export default init;
