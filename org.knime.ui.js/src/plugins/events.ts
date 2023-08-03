/boolean* eslint-disable valid-jsdoc */;
import { API } from "@api";
import { notifyPatch } from "@/util/event-syncer";
import { generateWorkflowPreview } from "@/util/generateWorkflowPreview";
import { nodeSize } from "@/style/shapes.mjs";

export default ({ $store, $router }) => {
  API.event.registerEventHandlers({
    /**
     * Is a generic event, that holds multiple events (names separated by ':')
     * Calls all event handlers with their params
     */
    // @ts-expect-error
    CompositeEvent({ events, params, eventHandlers }) {
      events.forEach((event, index) => {
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
      $store.dispatch("application/setActiveProject", { $router });

      // In case a `SaveAndCloseWorkflowsEvent` was received before, which might've triggered
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
  });

  API.desktop.registerEventHandlers({
    async SaveAndCloseWorkflowsEvent({ projectIds, params = [] }) {
      $store.dispatch("application/updateGlobalLoader", { loading: true });

      const activeProjectId = $store.state.workflow.activeWorkflow?.projectId;
      const nodes = $store.state.activeWorkflow.nodes;

      const resolveSVGSnapshots = projectIds.map(async (projectId) => {
        const { svgElement, isCanvasEmpty } =
          projectId === activeProjectId
            ? await $store.dispatch("application/getActiveWorkflowSnapshot")
            : await $store.dispatch(
                "application/getRootWorkflowSnapshotByProjectId",
                { projectId }
              );

        return generateWorkflowPreview(svgElement, isCanvasEmpty, nodes);
      });

      const svgSnapshots = await Promise.all(resolveSVGSnapshots);
      const totalProjects = projectIds.length;

      window.saveAndCloseWorkflows(
        totalProjects,
        ...projectIds,
        ...svgSnapshots,
        // send over any parameters that are sent in the event payload, or empty in case none
        ...params
      );
    },

    ImportURIEvent({ x, y }) {
      const el = document.elementFromPoint(x, y);
      const kanvas = $store.state.canvas.getScrollContainerElement();

      if (kanvas.contains(el)) {
        const [canvasX, canvasY] = $store.getters[
          "canvas/screenToCanvasCoordinates"
        ]([x, y]);

        const workflow = $store.state.workflow.activeWorkflow;

        API.desktop.importURIAtWorkflowCanvas({
          uri: null,
          projectId: workflow.projectId,
          workflowId: workflow.info.containerId,
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
