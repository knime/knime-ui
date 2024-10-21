import type { ActionTree, GetterTree, MutationTree } from "vuex";

import { API } from "@/api";
import type { ExampleProject, WorkflowObject } from "@/api/custom-types";
import {
  AppState,
  type PortType,
  type Project,
  type UpdateAvailableEvent,
  type XY,
} from "@/api/gateway-api/generated-api";
import { findSpaceById } from "@/store/spaces/util";
import { nodeSize } from "@/style/shapes";
import { workflowNavigationService } from "@/util/workflowNavigationService";
import type { RootStoreState } from "../types";
import { getNextProjectId } from "../workflow/util";

import * as canvasModes from "./canvasModes";
import * as canvasStateTracking from "./canvasStateTracking";
import * as dirtyProjectTracking from "./dirtyProjectsTracking";
import * as globalLoader from "./globalLoader";
import * as lifecycle from "./lifecycle";
import * as settings from "./settings";
import * as workflowPreviewSnapshots from "./workflowPreviewSnapshots";

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
  /**
   * Show the shortcuts overview dialog
   */
  isShortcutsOverviewDialogOpen: boolean;
  /**
   * KNIME AP download link
   */
  analyticsPlatformDownloadURL: string | null;
  /**
   * If 'true', node dialog changes are persisted on click-away without confirmation
   */
  askToConfirmNodeConfigChanges: boolean;
  /**
   * Custom help menu entries, if present
   */
  customHelpMenuEntries: Record<string, string>;

  appMode: AppState.AppModeEnum;

  dismissedUpdateBanner: boolean; // Property to track banner dismissal
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
  isShortcutsOverviewDialogOpen: false,
  analyticsPlatformDownloadURL: null,
  askToConfirmNodeConfigChanges: true,
  customHelpMenuEntries: {},

  appMode: AppState.AppModeEnum.Default,
  dismissedUpdateBanner: false,
});

export const mutations: MutationTree<ApplicationState> = {
  ...lifecycle.mutations,
  ...workflowPreviewSnapshots.mutations,
  ...canvasStateTracking.mutations,
  ...settings.mutations,
  ...globalLoader.mutations,
  ...dirtyProjectTracking.mutations,
  ...canvasModes.mutations,

  setActiveProjectId(state, projectId) {
    state.activeProjectId = projectId;
  },
  setOpenProjects(state, projects) {
    state.openProjects = projects;
  },
  setExampleProjects(state, examples: ExampleProject[]) {
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
  setIsShortcutsOverviewDialogOpen(state, value) {
    state.isShortcutsOverviewDialogOpen = value;
  },
  setAnalyticsPlatformDownloadURL(state, analyticsPlatformDownloadURL) {
    state.analyticsPlatformDownloadURL = analyticsPlatformDownloadURL;
  },
  setAskToConfirmNodeConfigChanges(state, value) {
    state.askToConfirmNodeConfigChanges = value;
  },
  setCustomHelpMenuEntries(state, customHelpMenuEntries) {
    state.customHelpMenuEntries = customHelpMenuEntries;
  },
  setAppMode(state, mode) {
    state.appMode = mode;
  },
  setDismissedUpdateBanner(state, dismissed: boolean) {
    state.dismissedUpdateBanner = dismissed;
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
  replaceApplicationState(
    { commit, dispatch, state },
    applicationState: AppState,
  ) {
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

    // Note: since it's a boolean value, a truthy check won't work because the `false` value won't be set
    if (applicationState.hasOwnProperty("confirmNodeConfigChanges")) {
      commit(
        "setAskToConfirmNodeConfigChanges",
        applicationState.confirmNodeConfigChanges,
      );
    }

    if (applicationState.featureFlags) {
      commit("setFeatureFlags", applicationState.featureFlags);
    }

    // needs to be assigned before the ui controls are initialized
    if (applicationState.analyticsPlatformDownloadURL) {
      commit(
        "setAnalyticsPlatformDownloadURL",
        applicationState.analyticsPlatformDownloadURL,
      );
    }

    if (applicationState.appMode) {
      commit("setAppMode", applicationState.appMode);
      dispatch("uiControls/init", null, { root: true });
    }

    if (applicationState.openProjects) {
      commit("setOpenProjects", applicationState.openProjects);
      dispatch(
        "spaces/syncPathWithOpenProjects",
        { openProjects: applicationState.openProjects },
        { root: true },
      );
    }

    // Note: since it's a boolean value, a truthy check won't work because the `false` value won't be set
    if (applicationState.hasOwnProperty("scrollToZoomEnabled")) {
      commit("setScrollToZoomEnabled", applicationState.scrollToZoomEnabled);
    }

    // Note: since it's a boolean value, a truthy check won't work because the `false` value won't be set
    if (applicationState.hasOwnProperty("useEmbeddedDialogs")) {
      commit("setUseEmbeddedDialogs", applicationState.useEmbeddedDialogs);
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
        dispatch("nodeRepository/resetSearchTagsAndTree", {}, { root: true });
      }
    }

    if (applicationState.hasOwnProperty("activeNodeCollection")) {
      commit("setActiveNodeCollection", applicationState.activeNodeCollection);
    }

    // Note: since it's a boolean value, a truthy check won't work because the `false` value won't be set
    if (applicationState.hasOwnProperty("devMode")) {
      commit("setDevMode", applicationState.devMode);
    }

    if (applicationState.hasOwnProperty("isSubnodeLockingEnabled")) {
      commit(
        "setIsSubnodeLockingEnabled",
        applicationState.isSubnodeLockingEnabled,
      );
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
      dispatch("canvas/focus", null, { root: true });
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

    const eventBasedPosition = () => {
      const { clientX, clientY } = event;
      if (!clientX && !clientY) {
        return null;
      }

      const screenToCanvasCoordinates =
        rootGetters["canvas/screenToCanvasCoordinates"];
      const [x, y] = screenToCanvasCoordinates([clientX, clientY]);

      return { x, y };
    };

    // the node offset is also fine for annotations so we use it all the time
    const extractXYWithOffset = ({ x, y }: XY) => ({
      x: x + nodeSize / 2,
      y: y + nodeSize / 2,
    });

    const centerOfVisibleArea =
      rootGetters["canvas/getCenterOfScrollContainer"];

    // fallback position for keyboard shortcut to open context menu
    const selectionBasedPosition = async () => {
      const selectedObjects: WorkflowObject[] =
        rootGetters["selection/selectedObjects"];
      if (selectedObjects.length === 0) {
        return null;
      }

      // use position of object if we only have one selected
      if (selectedObjects.length === 1) {
        return extractXYWithOffset(selectedObjects[0]);
      }

      // try to find the object that is nearest going left from the right border (y-centered) of the visible area
      const mostRightObject = await workflowNavigationService.nearestObject({
        objects: selectedObjects,
        reference: {
          ...centerOfVisibleArea("right"),
          id: "",
        },
        direction: "left",
      });

      // the nearestObject uses some max distances so it can happen that there is nothing "found"
      if (!mostRightObject) {
        return null;
      }
      return extractXYWithOffset(mostRightObject);
    };

    const position =
      eventBasedPosition() ??
      (await selectionBasedPosition()) ??
      centerOfVisibleArea();

    state.contextMenu = {
      isOpen: true,
      position,
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
  isUnknownProject({ openProjects }, _getters, rootState) {
    return (projectId: string) => {
      const foundProject = openProjects.find(
        (project) => project.projectId === projectId,
      );

      if (!foundProject || !foundProject.origin) {
        return true;
      }

      const spaceProviders = rootState.spaces.spaceProviders ?? {};

      // try to find a provider that contains the spaceId referenced
      // by the activeProject's origin
      return !findSpaceById(spaceProviders, foundProject.origin!.spaceId);
    };
  },

  isDirtyActiveProject({ dirtyProjectsMap, activeProjectId }) {
    if (!activeProjectId) {
      return false;
    }
    return Boolean(dirtyProjectsMap[activeProjectId]);
  },
};
