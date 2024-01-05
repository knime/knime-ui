import type { ActionTree, GetterTree, MutationTree } from "vuex";

import type {
  ExampleProject,
  PortType,
  UpdateAvailableEvent,
  Project,
  XY,
} from "@/api/gateway-api/generated-api";
import { API } from "@api";

import type { RootStoreState } from "../types";
import { getNextProjectId } from "../workflow/util";

import * as lifecycle from "./lifecycle";
import * as workflowPreviewSnapshots from "./workflowPreviewSnapshots";
import * as canvasStateTracking from "./canvasStateTracking";
import * as settings from "./settings";
import * as globalLoader from "./globalLoader";
import * as dirtyProjectTracking from "./dirtyProjectsTracking";
import * as canvasModes from "./canvasModes";
import * as permissions from "./permissions";

export interface ApplicationState {
  /**
   * Currently open projects (tabs)
   */
  openProjects: Array<Project>;
  /**
   * Id of currently active project (tab)
   */
  activeProjectId: string | null;
  /**
   * Map of all available port types (based on installed extensions, etc)
   */
  availablePortTypes: Record<string, PortType>;
  /**
   * A list provided by the backend that says which ports should be suggested to the user in the port type menu.
   */
  suggestedPortTypes: Array<string>;
  /**
   * A list of component types
   */
  availableComponentTypes: Array<string>;
  /**
   * Workflow Context Menu state
   */
  contextMenu: {
    isOpen: boolean;
    position: XY | null;
  };
  /**
   * Object to track state of available updates
   */
  availableUpdates: UpdateAvailableEvent | null;
  /**
   * Available feature flags
   */
  featureFlags: Record<string, boolean>;
  /**
   * example projects with name, svg and origin
   */
  exampleProjects: Array<ExampleProject>;
  /**
   * an object that maps supported file extensions to their node template id
   */
  fileExtensionToNodeTemplateId: Record<string, string>;
  /**
   * indicates if node repository is loaded
   */
  nodeRepositoryLoaded: boolean;
  nodeRepositoryLoadingProgress: {
    progress: number;
    extensionName: string;
  } | null;
}

/*
 * This store provides global application logic
 */
export const state = (): ApplicationState => ({
  ...lifecycle.state(),
  ...workflowPreviewSnapshots.state(),
  ...canvasStateTracking.state(),
  ...settings.state(),
  ...globalLoader.state(),
  ...dirtyProjectTracking.state(),
  ...canvasModes.state(),
  ...permissions.state(),

  openProjects: [],
  activeProjectId: null,
  availablePortTypes: {},
  suggestedPortTypes: [],
  availableComponentTypes: [],
  contextMenu: {
    isOpen: false,
    position: null,
  },
  availableUpdates: null,
  featureFlags: {},
  exampleProjects: [],
  fileExtensionToNodeTemplateId: {},

  nodeRepositoryLoaded: false,
  nodeRepositoryLoadingProgress: null,
});

export const mutations: MutationTree<ApplicationState> = {
  ...lifecycle.mutations,
  ...workflowPreviewSnapshots.mutations,
  ...canvasStateTracking.mutations,
  ...settings.mutations,
  ...globalLoader.mutations,
  ...dirtyProjectTracking.mutations,
  ...canvasModes.mutations,
  ...permissions.mutations,

  setActiveProjectId(state, projectId) {
    state.activeProjectId = projectId;
  },
  setOpenProjects(state, projects) {
    state.openProjects = projects;
  },
  setExampleProjects(state, examples) {
    state.exampleProjects = examples;
  },
  setAvailablePortTypes(state, availablePortTypes) {
    state.availablePortTypes = availablePortTypes;
  },
  setSuggestedPortTypes(state, portTypesIds) {
    state.suggestedPortTypes = portTypesIds;
  },
  setAvailableComponentTypes(state, componentTypes) {
    state.availableComponentTypes = componentTypes;
  },
  setFeatureFlags(state, featureFlags) {
    state.featureFlags = featureFlags;
  },
  setContextMenu(state, value) {
    state.contextMenu = value;
  },
  setAvailableUpdates(state, availableUpdates) {
    state.availableUpdates = availableUpdates;
  },
  setFileExtensionToNodeTemplateId(state, fileExtensionToNodeTemplateId) {
    state.fileExtensionToNodeTemplateId = fileExtensionToNodeTemplateId;
  },
  setNodeRepositoryLoaded(state, nodeRepositoryLoaded) {
    state.nodeRepositoryLoaded = nodeRepositoryLoaded;
  },
  setNodeRepositoryLoadingProgress(state, nodeRepositoryLoadingProgress) {
    state.nodeRepositoryLoadingProgress = nodeRepositoryLoadingProgress;
  },
};

export const actions: ActionTree<ApplicationState, RootStoreState> = {
  ...lifecycle.actions,
  ...workflowPreviewSnapshots.actions,
  ...canvasStateTracking.actions,
  ...settings.actions,
  ...globalLoader.actions,
  ...dirtyProjectTracking.actions,
  ...canvasModes.actions,

  // ----------------------------------------------------------------------------------------- //
  replaceApplicationState({ commit, dispatch, state }, applicationState) {
    // Only set application state properties present in the received object
    if (applicationState.availablePortTypes) {
      commit("setAvailablePortTypes", applicationState.availablePortTypes);
    }

    if (applicationState.suggestedPortTypeIds) {
      commit("setSuggestedPortTypes", applicationState.suggestedPortTypeIds);
    }

    if (applicationState.availableComponentTypes) {
      commit(
        "setAvailableComponentTypes",
        applicationState.availableComponentTypes,
      );
    }

    // Note: since it's a boolean value, a truthy check won't work because the `false` value won't be set
    if (applicationState.hasOwnProperty("hasNodeRecommendationsEnabled")) {
      commit(
        "setHasNodeRecommendationsEnabled",
        applicationState.hasNodeRecommendationsEnabled,
      );
    }

    if (applicationState.featureFlags) {
      commit("setFeatureFlags", applicationState.featureFlags);
    }

    if (applicationState.openProjects) {
      commit("setOpenProjects", applicationState.openProjects);
      dispatch(
        "spaces/syncPathWithOpenProjects",
        { openProjects: applicationState.openProjects },
        { root: true },
      );
    }

    if (applicationState.exampleProjects) {
      commit("setExampleProjects", applicationState.exampleProjects);
    }

    // Note: since it's a boolean value, a truthy check won't work because the `false` value won't be set
    if (applicationState.hasOwnProperty("scrollToZoomEnabled")) {
      commit("setScrollToZoomEnabled", applicationState.scrollToZoomEnabled);
    }

    // Note: since it's a boolean value, a truthy check won't work because the `false` value won't be set
    if (applicationState.hasOwnProperty("hasNodeCollectionActive")) {
      const currentValue = state.hasNodeCollectionActive;

      // we always set the state to init the value based on the saved user preference
      commit(
        "setHasNodeCollectionActive",
        applicationState.hasNodeCollectionActive,
      );

      if (
        currentValue !== null &&
        currentValue !== applicationState.hasNodeCollectionActive
      ) {
        // only fetch when the value has actually changed
        dispatch("nodeRepository/resetSearchAndCategories", {}, { root: true });
      }
    }

    // Note: since it's a boolean value, a truthy check won't work because the `false` value won't be set
    if (applicationState.hasOwnProperty("devMode")) {
      commit("setDevMode", applicationState.devMode);
    }

    if (applicationState.fileExtensionToNodeTemplateId) {
      commit(
        "setFileExtensionToNodeTemplateId",
        applicationState.fileExtensionToNodeTemplateId,
      );
    }

    if (applicationState.hasOwnProperty("nodeRepositoryLoaded")) {
      commit("setNodeRepositoryLoaded", applicationState.nodeRepositoryLoaded);
    }
  },

  async forceCloseProjects({ state }, { projectIds }) {
    const { openProjects, activeProjectId } = state;
    const nextProjectId = getNextProjectId({
      openProjects,
      activeProjectId,
      closingProjectIds: projectIds,
    });

    await API.desktop.forceCloseProjects({ projectIds });
    return nextProjectId;
  },

  async toggleContextMenu(
    { state, commit, dispatch, rootGetters, rootState },
    { event = null, deselectAllObjects = false } = {},
  ) {
    // close other menus if they are open
    if (rootState.workflow.quickAddNodeMenu.isOpen) {
      rootState.workflow.quickAddNodeMenu.events.menuClose?.();
    }

    if (rootState.workflow.portTypeMenu.isOpen) {
      rootState.workflow.portTypeMenu.events.menuClose?.();
    }

    // close an open menu
    if (state.contextMenu.isOpen) {
      // when closing an active menu, we could optionally receive a native event
      // e.g. the menu is getting closed by right-clicking again
      event?.preventDefault();
      commit("setContextMenu", { isOpen: false, position: null });
      return;
    }

    // safety check
    if (!event) {
      return;
    }

    // we do not want it to bubble up if we handle it here
    event.stopPropagation();
    event.preventDefault();

    if (deselectAllObjects) {
      await dispatch("selection/deselectAllObjects", null, { root: true });
    }

    // reset to selection mode
    await dispatch("resetCanvasMode");

    const { clientX, clientY } = event;
    const screenToCanvasCoordinates =
      rootGetters["canvas/screenToCanvasCoordinates"];
    const [x, y] = screenToCanvasCoordinates([clientX, clientY]);

    state.contextMenu = {
      isOpen: true,
      position: { x, y },
    };
  },
};

export const getters: GetterTree<ApplicationState, RootStoreState> = {
  ...lifecycle.getters,
  ...workflowPreviewSnapshots.getters,
  ...canvasStateTracking.getters,
  ...settings.getters,
  ...globalLoader.getters,
  ...dirtyProjectTracking.getters,
  ...canvasModes.getters,

  activeProjectOrigin({ openProjects, activeProjectId }) {
    if (!activeProjectId) {
      return null;
    }

    const activeProject = openProjects.find(
      (project) => project.projectId === activeProjectId,
    );

    if (!activeProject) {
      return null;
    }

    return activeProject.origin ?? null;
  },
  isUnknownProject(_state, getters, rootState) {
    if (getters.activeProjectOrigin === null) {
      return true;
    }

    const spaceProviders = rootState.spaces.spaceProviders ?? {};

    // try to find a provider that contains the spaceId referenced
    // by the activeProject's origin
    return !Object.values(spaceProviders).find((provider) => {
      const { spaces = [] } = provider;
      return spaces.find(
        (space) => space.id === getters.activeProjectOrigin.spaceId,
      );
    });
  },
};
