import { API } from "@api";
import { defineStore } from "pinia";

import type { AvailablePortTypes, ExampleProject } from "@/api/custom-types";
import {
  AppState,
  type PortType,
  type Project,
  type SpaceItemReference,
  type UpdateAvailableEvent,
} from "@/api/gateway-api/generated-api";
import { useNodeConfigurationStore } from "@/store/nodeConfiguration/nodeConfiguration";
import { useNodeRepositoryStore } from "@/store/nodeRepository";
import { useSpaceCachingStore } from "@/store/spaces/caching";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { findSpaceById } from "@/store/spaces/util";
import { useUIControlsStore } from "@/store/uiControls/uiControls";

import { useApplicationSettingsStore } from "./settings";

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
  dismissedHomePageTile: boolean;
  dismissedHubLoginBanner: boolean;
}

/*
 * This store provides global application logic
 */
export const useApplicationStore = defineStore("application", {
  state: (): ApplicationState => ({
    openProjects: [],
    activeProjectId: null,
    availablePortTypes: {},
    suggestedPortTypes: [],
    availableComponentTypes: [],
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
    dismissedHomePageTile: false,
    dismissedHubLoginBanner: false,
  }),
  actions: {
    setActiveProjectId(projectId: string | null) {
      this.activeProjectId = projectId;
    },

    setOpenProjects(projects: Project[]) {
      this.openProjects = projects;
    },

    async updateOpenProjectsOrder(projects: Project[]) {
      this.setOpenProjects(projects); // optimistic update

      const projectIds = projects.map(({ projectId }) => projectId);
      await API.desktop.updateOpenProjectsOrder({ projectIds });
    },

    setExampleProjects(examples: ExampleProject[]) {
      this.exampleProjects = examples;
    },

    setAvailablePortTypes(availablePortTypes: AvailablePortTypes) {
      this.availablePortTypes = availablePortTypes;
    },

    setSuggestedPortTypes(portTypesIds: string[]) {
      this.suggestedPortTypes = portTypesIds;
    },

    setAvailableComponentTypes(componentTypes: string[]) {
      this.availableComponentTypes = componentTypes;
    },

    setFeatureFlags(featureFlags: Record<string, boolean>) {
      this.featureFlags = featureFlags;
    },

    setAvailableUpdates(
      availableUpdates: ApplicationState["availableUpdates"],
    ) {
      this.availableUpdates = availableUpdates;
    },

    setFileExtensionToNodeTemplateId(
      fileExtensionToNodeTemplateId: ApplicationState["fileExtensionToNodeTemplateId"],
    ) {
      this.fileExtensionToNodeTemplateId = fileExtensionToNodeTemplateId;
    },

    setNodeRepositoryLoaded(nodeRepositoryLoaded: boolean) {
      this.nodeRepositoryLoaded = nodeRepositoryLoaded;
    },

    setNodeRepositoryLoadingProgress(
      nodeRepositoryLoadingProgress: ApplicationState["nodeRepositoryLoadingProgress"],
    ) {
      this.nodeRepositoryLoadingProgress = nodeRepositoryLoadingProgress;
    },

    setIsShortcutsOverviewDialogOpen(isShortcutsOverviewDialogOpen: boolean) {
      this.isShortcutsOverviewDialogOpen = isShortcutsOverviewDialogOpen;
    },

    setAnalyticsPlatformDownloadURL(analyticsPlatformDownloadURL: string) {
      this.analyticsPlatformDownloadURL = analyticsPlatformDownloadURL;
    },

    setAskToConfirmNodeConfigChanges(askToConfirmNodeConfigChanges: boolean) {
      this.askToConfirmNodeConfigChanges = askToConfirmNodeConfigChanges;
    },

    setCustomHelpMenuEntries(
      customHelpMenuEntries: ApplicationState["customHelpMenuEntries"],
    ) {
      this.customHelpMenuEntries = customHelpMenuEntries;
    },

    setAppMode(mode: AppState.AppModeEnum) {
      this.appMode = mode;
    },

    setDismissedUpdateBanner(dismissed: boolean) {
      this.dismissedUpdateBanner = dismissed;
    },

    // eslint-disable-next-line complexity
    replaceApplicationState(applicationState: AppState) {
      const applicationSettingsStore = useApplicationSettingsStore();
      // Only set application state properties present in the received object
      if (applicationState.availablePortTypes) {
        this.setAvailablePortTypes(applicationState.availablePortTypes);
      }

      if (applicationState.suggestedPortTypeIds) {
        this.setSuggestedPortTypes(applicationState.suggestedPortTypeIds);
      }

      if (applicationState.availableComponentTypes) {
        this.setAvailableComponentTypes(
          applicationState.availableComponentTypes,
        );
      }

      // Note: since it's a boolean value, a truthy check won't work because the `false` value won't be set
      if (applicationState.hasOwnProperty("hasNodeRecommendationsEnabled")) {
        applicationSettingsStore.setHasNodeRecommendationsEnabled(
          applicationState.hasNodeRecommendationsEnabled!,
        );
      }

      // Note: since it's a boolean value, a truthy check won't work because the `false` value won't be set
      if (applicationState.hasOwnProperty("confirmNodeConfigChanges")) {
        this.setAskToConfirmNodeConfigChanges(
          applicationState.confirmNodeConfigChanges!,
        );
      }

      if (applicationState.featureFlags) {
        this.setFeatureFlags(applicationState.featureFlags);
      }

      // needs to be assigned before the ui controls are initialized
      if (applicationState.analyticsPlatformDownloadURL) {
        this.setAnalyticsPlatformDownloadURL(
          applicationState.analyticsPlatformDownloadURL,
        );
      }

      if (applicationState.appMode) {
        this.setAppMode(applicationState.appMode);
        useUIControlsStore().init();
      }

      if (applicationState.openProjects) {
        this.setOpenProjects(applicationState.openProjects);
        useSpaceCachingStore().syncPathWithOpenProjects({
          openProjects: applicationState.openProjects,
        });
      }

      // Note: since it's a boolean value, a truthy check won't work because the `false` value won't be set
      if (applicationState.hasOwnProperty("scrollToZoomEnabled")) {
        applicationSettingsStore.setScrollToZoomEnabled(
          applicationState.scrollToZoomEnabled!,
        );
      }

      // Note: since it's a boolean value, a truthy check won't work because the `false` value won't be set
      if (applicationState.hasOwnProperty("useEmbeddedDialogs")) {
        // if setting has changed, discard any possible pending changes in a node configuration
        if (!applicationState.useEmbeddedDialogs) {
          useNodeConfigurationStore().discardSettings();
        }

        applicationSettingsStore.setUseEmbeddedDialogs(
          applicationState.useEmbeddedDialogs!,
        );
      }

      // Note: since it's a boolean value, a truthy check won't work because the `false` value won't be set
      if (applicationState.hasOwnProperty("isKaiEnabled")) {
        applicationSettingsStore.setIsKaiEnabled(
          applicationState.isKaiEnabled!,
        );
      }

      // Note: since it's a boolean value, a truthy check won't work because the `false` value won't be set
      if (applicationState.hasOwnProperty("hasNodeCollectionActive")) {
        const currentValue = applicationSettingsStore.hasNodeCollectionActive;

        // we always set the state to init the value based on the saved user preference
        applicationSettingsStore.setHasNodeCollectionActive(
          applicationState.hasNodeCollectionActive!,
        );

        if (
          currentValue !== null &&
          currentValue !== applicationState.hasNodeCollectionActive
        ) {
          // only fetch when the value has actually changed
          useNodeRepositoryStore().resetSearchAndTags();
        }
      }

      if (applicationState.hasOwnProperty("activeNodeCollection")) {
        applicationSettingsStore.setActiveNodeCollection(
          applicationState.activeNodeCollection!,
        );
      }

      // Note: since it's a boolean value, a truthy check won't work because the `false` value won't be set
      if (applicationState.hasOwnProperty("devMode")) {
        applicationSettingsStore.setDevMode(applicationState.devMode!);
      }

      if (applicationState.hasOwnProperty("isSubnodeLockingEnabled")) {
        applicationSettingsStore.setIsSubnodeLockingEnabled(
          applicationState.isSubnodeLockingEnabled!,
        );
      }

      if (applicationState.fileExtensionToNodeTemplateId) {
        this.setFileExtensionToNodeTemplateId(
          applicationState.fileExtensionToNodeTemplateId,
        );
      }

      if (applicationState.hasOwnProperty("nodeRepositoryLoaded")) {
        this.setNodeRepositoryLoaded(applicationState.nodeRepositoryLoaded!);
      }
    },
  },
  getters: {
    activeProjectOrigin: (state): SpaceItemReference | null => {
      if (!state.activeProjectId) {
        return null;
      }

      const activeProject = state.openProjects.find(
        (project) => project.projectId === state.activeProjectId,
      );

      if (!activeProject) {
        return null;
      }

      return activeProject.origin ?? null;
    },

    isUnknownProject: (state) => (projectId: string | null) => {
      const foundProject = state.openProjects.find(
        (project) => project.projectId === projectId,
      );

      if (!foundProject?.origin) {
        return true;
      }

      const spaceProviders = useSpaceProvidersStore().spaceProviders ?? {};

      // try to find a provider that contains the spaceId referenced
      // by the activeProject's origin
      return !findSpaceById(spaceProviders, foundProject.origin.spaceId);
    },

    /**
     * Determines which project id should be set after closing the active one
     *
     * @returns next project id to set
     */
    getNextProjectId:
      (state) =>
      ({ closingProjectIds }: { closingProjectIds: Array<string> }) => {
        if (!closingProjectIds.includes(state.activeProjectId ?? "")) {
          return state.activeProjectId;
        }

        if (state.openProjects.length === 1) {
          return null; // null equals going to the entry page
        }

        const remainingProjects = state.openProjects.filter(
          (project) => !closingProjectIds.includes(project.projectId),
        );

        if (remainingProjects.length === 0) {
          return null; // null equals going to the entry page
        }

        return remainingProjects.at(-1)!.projectId;
      },
  },
});
