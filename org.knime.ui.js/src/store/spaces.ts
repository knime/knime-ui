/* eslint-disable max-lines */
import { API } from "@api";
import { APP_ROUTES } from "@/router/appRoutes";
import ITEM_TYPES from "@/util/spaceItemTypes";
import type { SpaceProvider } from "@/api/custom-types";
import {
  SpaceItem,
  type SpaceItemReference,
  type WorkflowGroupContent,
} from "@/api/gateway-api/generated-api";
import type { ActionTree, GetterTree, MutationTree } from "vuex";
import type { RootStoreState } from "./types";

export interface PathTriplet {
  spaceId: string;
  spaceProviderId: string;
  itemId: string;
}

interface CreateWorkflowModalConfig {
  isOpen: boolean;
  projectId: string;
}

export interface SpacesState {
  workflowGroupCache: WeakMap<PathTriplet, WorkflowGroupContent>;
  spaceProviders?: Record<string, SpaceProvider>;
  projectPath: Record<string, PathTriplet>;
  isLoadingProvider: boolean;
  hasLoadedProviders: boolean;
  isLoadingContent: boolean;
  createWorkflowModalConfig: CreateWorkflowModalConfig;
  activeRenamedItemId: string;
}

export const globalSpaceBrowserProjectId = "__SPACE_BROWSER_TAB__";
export const cachedLocalSpaceProjectId = "__LOCAL_ROOT__";

const localRootProjectPath = {
  spaceId: "local",
  spaceProviderId: "local",
  itemId: "root",
};

const specialProjectIds = [
  globalSpaceBrowserProjectId,
  cachedLocalSpaceProjectId,
];

export const state = (): SpacesState => ({
  // current content of active browser (files and folders)
  workflowGroupCache: new WeakMap(),
  // metadata of all available space providers and their spaces (including local)
  spaceProviders: null,
  // triplet data to remember current "path" of any SpaceExplorer component
  projectPath: {
    [cachedLocalSpaceProjectId]: localRootProjectPath,
  },
  // loading state
  isLoadingProvider: false,
  hasLoadedProviders: false,
  isLoadingContent: false,
  // modal open state
  createWorkflowModalConfig: {
    isOpen: false,
    projectId: null,
  },
  activeRenamedItemId: "",
});

export const mutations: MutationTree<SpacesState> = {
  setIsLoadingProvider(state, value: boolean) {
    state.isLoadingProvider = value;
  },
  setIsLoadingContent(state, value: boolean) {
    state.isLoadingContent = value;
  },
  setHasLoadedProviders(state, value: boolean) {
    state.hasLoadedProviders = value;
  },

  setCreateWorkflowModalConfig(state, value: CreateWorkflowModalConfig) {
    state.createWorkflowModalConfig = value;
  },

  setProjectPath(
    state,
    { projectId, value }: { projectId: string; value: PathTriplet }
  ) {
    state.projectPath = {
      ...state.projectPath,
      [projectId]: value,
    };
  },

  removeProjectPath(state, projectId: string) {
    // removing the projectPath object will also clear the workflowGroupCache
    // for that path as it is used as key for the WeakMap
    delete state.projectPath[projectId];
  },

  updateProjectPath(
    state,
    { projectId, value }: { projectId: string; value: Partial<PathTriplet> }
  ) {
    const oldValue = state.projectPath[projectId];
    if (!oldValue) {
      consola.warn(
        "updateProjectPath failed project was never added",
        projectId
      );
      return false;
    }

    state.projectPath = {
      ...state.projectPath,
      [projectId]: { ...oldValue, ...value },
    };
    return true;
  },

  setWorkflowGroupContent(
    state,
    { projectId, content }: { projectId: string; content: WorkflowGroupContent }
  ) {
    const key = state.projectPath[projectId];
    state.workflowGroupCache.set(key, content);
  },

  setSpaceProviders(state, value: Record<string, SpaceProvider>) {
    state.spaceProviders = value;
  },

  setActiveRenamedItemId(state, value: string) {
    state.activeRenamedItemId = value;
  },
};

export const actions: ActionTree<SpacesState, RootStoreState> = {
  syncPathWithOpenProjects(
    { commit, state },
    {
      openProjects,
    }: { openProjects: { projectId: string; origin: SpaceItemReference }[] }
  ) {
    // add
    openProjects.forEach(({ projectId, origin }) => {
      if (!state.projectPath[projectId]) {
        // Take local root as default in case the workflow does not have an origin (ex. was Drag & Dropped from hub)
        let projectPath = localRootProjectPath;
        if (origin) {
          const {
            spaceId,
            providerId: spaceProviderId,
            ancestorItemIds: [itemId = "root"],
          } = origin;
          projectPath = {
            spaceId,
            spaceProviderId,
            itemId,
          };
        }
        commit("setProjectPath", {
          projectId,
          value: projectPath,
        });
      }
    });
    // remove
    const openProjectIds = openProjects.map((project) => project.projectId);
    const unknownProjectIds = Object.keys(state.projectPath).filter(
      (id) => !specialProjectIds.includes(id) && !openProjectIds.includes(id)
    );
    unknownProjectIds.forEach((projectId) => {
      commit("removeProjectPath", projectId);
    });
  },

  async loadLocalSpace({ dispatch, commit }) {
    const spacesData = await dispatch("fetchProviderSpaces", {
      id: localRootProjectPath.spaceProviderId,
    });

    const localSpace = {
      id: "local",
      name: "Local space",
      connected: true,
      connectionMode: "AUTOMATIC",
      local: true,
      ...spacesData,
    };

    commit("setSpaceProviders", {
      [localRootProjectPath.spaceProviderId]: localSpace,
    });
  },

  refreshSpaceProviders(
    { state, commit, dispatch },
    { keepLocalSpace = true } = {}
  ) {
    if (state.isLoadingProvider) {
      return;
    }

    const localSpace =
      state.spaceProviders[localRootProjectPath.spaceProviderId];

    const spaceProviders = keepLocalSpace
      ? { [localRootProjectPath.spaceProviderId]: localSpace }
      : null;

    commit("setSpaceProviders", spaceProviders);

    dispatch("fetchAllSpaceProviders");
  },

  fetchAllSpaceProviders({ commit, state }) {
    if (state.isLoadingProvider) {
      return;
    }

    commit("setIsLoadingProvider", true);

    // provider fetch happens async, so the payload will be received via a
    // `SpaceProvidersResponseEvent` which will then call the `setAllSpaceProviders`
    // action
    API.desktop.getSpaceProviders();
  },

  async setAllSpaceProviders(
    { commit, state, dispatch },
    spaceProviders: Record<string, SpaceProvider>
  ) {
    try {
      const connectedProviderIds = Object.values(spaceProviders)
        .filter(
          ({ connected, connectionMode }) =>
            // skip loading local space
            // id !== localRootProjectPath.spaceProviderId &&
            connected || connectionMode === "AUTOMATIC"
        )
        .map(({ id }) => id);

      for (const id of connectedProviderIds) {
        const spacesData = await dispatch("fetchProviderSpaces", { id });
        // use current state of store to ensure the user is kept,
        // it's not part of the response and set by connectProvider
        spaceProviders[id] = {
          ...state.spaceProviders?.[id],
          ...spaceProviders[id],
          ...spacesData,
        };
      }
      commit("setSpaceProviders", spaceProviders);
      commit("setHasLoadedProviders", true);
    } catch (error) {
      commit("setHasLoadedProviders", false);
      consola.error("Error fetching providers", { error });
      throw error;
    } finally {
      commit("setIsLoadingProvider", false);
    }
  },

  async fetchProviderSpaces(_, { id }) {
    try {
      const providerData = await API.space.getSpaceProvider({
        spaceProviderId: id,
      });

      return { ...providerData, connected: true };
    } catch (error) {
      consola.error("Error fetching provider spaces", { error });
      throw error;
    }
  },

  async connectProvider({ dispatch, commit, state }, { spaceProviderId }) {
    try {
      commit("setIsLoadingProvider", true);
      const user = API.desktop.connectSpaceProvider({ spaceProviderId });

      if (user) {
        // Only fetch spaces when a valid user was returned
        const updatedProvider = await dispatch("fetchProviderSpaces", {
          id: spaceProviderId,
        });
        commit("setSpaceProviders", {
          ...state.spaceProviders,
          [spaceProviderId]: {
            ...state.spaceProviders[spaceProviderId],
            ...updatedProvider,
            user,
          },
        });
      }
    } catch (error) {
      consola.error("Error connecting to provider", { error });
      throw error;
    } finally {
      commit("setIsLoadingProvider", false);
    }
  },

  disconnectProvider({ commit, state }, { spaceProviderId }) {
    try {
      API.desktop.disconnectSpaceProvider({ spaceProviderId });

      // update project paths that used this space provider
      const projectsWithDisconnectedProvider = Object.entries(
        state.projectPath
      ).flatMap(([projectId, path]) =>
        path.spaceProviderId === spaceProviderId ? [projectId] : []
      );

      projectsWithDisconnectedProvider.forEach((projectId) =>
        commit("setProjectPath", {
          projectId,
          value: {
            spaceProviderId: "local",
            spaceId: "local",
            itemId: "root",
          },
        })
      );

      // update space provider state
      const { spaceProviders } = state;
      const { name, connectionMode } = spaceProviders[spaceProviderId];
      commit("setSpaceProviders", {
        ...state.spaceProviders,
        [spaceProviderId]: {
          id: spaceProviderId,
          name,
          connectionMode,
          connected: false,
        },
      });
      return spaceProviderId;
    } catch (error) {
      consola.error("Error disconnecting from provider", { error });
      throw error;
    }
  },

  async fetchWorkflowGroupContentByIdTriplet(
    { commit },
    { spaceId, spaceProviderId, itemId }
  ) {
    try {
      commit("setIsLoadingContent", true);
      const content = await API.space.listWorkflowGroup({
        spaceProviderId,
        spaceId,
        itemId,
      });

      return content;
    } catch (error) {
      consola.error("Error trying to fetch workflow group content", { error });
      throw error;
    } finally {
      commit("setIsLoadingContent", false);
    }
  },

  async fetchWorkflowGroupContent({ commit, state, dispatch }, { projectId }) {
    const pathTriplet = state.projectPath[projectId];
    const { spaceId, spaceProviderId, itemId } = pathTriplet;

    const content = await dispatch("fetchWorkflowGroupContentByIdTriplet", {
      spaceId,
      spaceProviderId,
      itemId,
    });

    commit("setWorkflowGroupContent", { projectId, content });

    return content;
  },

  async changeDirectory(
    { dispatch, getters, commit, state },
    { projectId, pathId }
  ) {
    const itemId = getters.pathToItemId(projectId, pathId);
    const { spaceId, spaceProviderId } = state.projectPath[projectId];
    const content = await dispatch("fetchWorkflowGroupContentByIdTriplet", {
      spaceId,
      spaceProviderId,
      itemId,
    });

    commit("updateProjectPath", { projectId, value: { itemId } });
    commit("setWorkflowGroupContent", { projectId, content });

    return { itemId };
  },

  async createWorkflow({ state, dispatch }, { projectId, workflowName }) {
    const { spaceId, spaceProviderId, itemId } = state.projectPath[projectId];

    try {
      // use global loader because just using the local one for the space explorer
      // is not enough since createWorkflow would also open a new workflow instead of just
      // doing a local operation like fetching data or renaming
      await dispatch(
        "application/updateGlobalLoader",
        { loading: true, config: { displayMode: "transparent" } },
        { root: true }
      );
      const newWorkflowItem = await API.space.createWorkflow({
        spaceProviderId,
        spaceId,
        itemId,
        itemName: workflowName,
      });
      await dispatch(
        "application/updateGlobalLoader",
        { loading: false },
        { root: true }
      );

      // re-fetch the content of the current folder to include the created workflow (in the background)
      dispatch("fetchWorkflowGroupContent", { projectId });

      return newWorkflowItem;
    } catch (error) {
      await dispatch(
        "application/updateGlobalLoader",
        { loading: false },
        { root: true }
      );
      consola.log("Error creating workflow", { error });
      throw error;
    }
  },

  async createFolder({ dispatch, state, commit }, { projectId }) {
    const { spaceId, spaceProviderId, itemId } = state.projectPath[projectId];

    try {
      // loading will be cleared after fetching the data by fetchWorkflowGroupContent
      commit("setIsLoadingContent", true);
      const newFolderItem = await API.space.createWorkflowGroup({
        spaceId,
        spaceProviderId,
        itemId,
      });

      await dispatch("fetchWorkflowGroupContent", { projectId });
      commit("setActiveRenamedItemId", newFolderItem.id);

      return newFolderItem;
    } catch (error) {
      commit("setIsLoadingContent", false);
      consola.log("Error creating folder", { error });
      throw error;
    }
  },

  async openWorkflow(
    { rootState, state, dispatch },
    { workflowItemId, $router, projectId }
  ) {
    const { spaceId, spaceProviderId } = state.projectPath[projectId];

    const { openProjects } = rootState.application;

    // eslint-disable-next-line no-extra-parens

    const foundOpenProject = openProjects.find(
      ({ origin }) =>
        origin &&
        origin.providerId === spaceProviderId &&
        origin.spaceId === spaceId &&
        origin.itemId === workflowItemId
    );

    if (foundOpenProject) {
      $router.push({
        name: APP_ROUTES.WorkflowPage,
        params: { workflowId: "root", projectId: foundOpenProject.projectId },
      });
      return;
    }

    // use global loader because just using the local one for the space explorer
    // is not enough since openWorkflow would open a new workflow instead of just
    // doing a local operation like fetching data or renaming
    await dispatch(
      "application/updateGlobalLoader",
      { loading: true, config: { displayMode: "transparent" } },
      { root: true }
    );
    API.desktop.openWorkflow({
      spaceProviderId,
      spaceId,
      itemId: workflowItemId,
    });
    await dispatch(
      "application/updateGlobalLoader",
      { loading: false },
      { root: true }
    );
  },

  async importToWorkflowGroup({ state, dispatch }, { projectId, importType }) {
    const { spaceId, spaceProviderId, itemId } = state.projectPath[projectId];
    const success =
      importType === "FILES"
        ? API.desktop.importFiles({ spaceProviderId, spaceId, itemId })
        : API.desktop.importWorkflows({ spaceProviderId, spaceId, itemId });

    if (success) {
      await dispatch("fetchWorkflowGroupContent", { projectId });
    }
  },

  async renameItem(
    { state, dispatch, commit },
    { projectId, itemId, newName }
  ) {
    const { spaceId, spaceProviderId } = state.projectPath[projectId];

    try {
      // loading is cleared after data is fetched by fetchWorkflowGroupContent
      commit("setIsLoadingContent", true);
      await API.space.renameItem({
        spaceProviderId,
        spaceId,
        itemId,
        itemName: newName,
      });

      await dispatch("fetchWorkflowGroupContent", { projectId });
    } catch (error) {
      commit("setIsLoadingContent", false);
      consola.log("Error renaming item", { error });
      throw error;
    }
  },

  async deleteItems({ state, dispatch, commit }, { projectId, itemIds }) {
    const { spaceId, spaceProviderId } = state.projectPath[projectId];

    try {
      // loading is cleared after data is fetched by fetchWorkflowGroupContent
      commit("setIsLoadingContent", true);
      commit("setActiveRenamedItemId", "");
      await API.space.deleteItems({ spaceProviderId, spaceId, itemIds });
      await dispatch("fetchWorkflowGroupContent", { projectId });
    } catch (error) {
      commit("setIsLoadingContent", false);
      consola.log("Error deleting item", { error });
      throw error;
    }
  },

  async moveItems(
    { state, dispatch, commit },
    { projectId, itemIds, destWorkflowGroupItemId, collisionStrategy }
  ) {
    const { spaceId, spaceProviderId } = state.projectPath[projectId];

    try {
      commit("setIsLoadingContent", true);
      await API.space.moveItems({
        spaceProviderId,
        spaceId,
        itemIds,
        destWorkflowGroupItemId,
        collisionHandling: collisionStrategy,
      });
      await dispatch("fetchWorkflowGroupContent", { projectId });
    } catch (error) {
      consola.log("Error moving items", { error });
      throw error;
    } finally {
      commit("setIsLoadingContent", false);
    }
  },

  copyBetweenSpaces({ state }, { projectId, itemIds }) {
    const { spaceId, spaceProviderId } = state.projectPath[projectId];
    API.desktop.copyBetweenSpaces({ spaceProviderId, spaceId, itemIds });
  },

  openInHub({ state }, { projectId, itemId }) {
    const { spaceId, spaceProviderId } = state.projectPath[projectId];
    API.desktop.openInHub({ spaceProviderId, spaceId, itemId });
  },
};

export const getters: GetterTree<SpacesState, RootStoreState> = {
  pathToItemId: (_, getters) => (projectId: string, pathId: string) => {
    const isGoingBack = pathId === "..";
    if (isGoingBack) {
      return getters.parentWorkflowGroupId(projectId);
    }
    return pathId;
  },

  parentWorkflowGroupId:
    (state, getters) =>
    (projectId: string): string => {
      const workflowGroupContent = getters.getWorkflowGroupContent(projectId);

      if (workflowGroupContent === null) {
        return null;
      }

      const { path } = workflowGroupContent;

      // we're already at the root, there's no parent
      if (path.length === 0) {
        return null;
      }

      // when we're down to 1 item it means we're 1 level away from the root
      return path.length === 1 ? "root" : path[path.length - 2].id;
    },

  currentWorkflowGroupId: (state, getters) => (projectId: string) => {
    const workflowGroupContent = getters.getWorkflowGroupContent(projectId);

    if (workflowGroupContent === null) {
      return null;
    }

    const { path } = workflowGroupContent;
    return path.length > 0 ? path[path.length - 1].id : "root";
  },

  getOpenedWorkflowItems:
    (state, getters, { application }) =>
    (projectId: string) => {
      const { spaceId, spaceProviderId } = state.projectPath[projectId];
      const { openProjects } = application;

      const workflowGroupContent = getters.getWorkflowGroupContent(projectId);

      if (workflowGroupContent === null) {
        return [];
      }

      const workflowItemIds = workflowGroupContent.items
        .filter((item) => item.type === ITEM_TYPES.Workflow)
        .map((item) => item.id);

      return openProjects
        .filter(
          ({ origin }) =>
            origin &&
            origin.providerId === spaceProviderId &&
            origin.spaceId === spaceId &&
            workflowItemIds.includes(origin.itemId)
        )
        .map(({ origin }) => origin.itemId);
    },

  getOpenedFolderItems:
    (state, getters, { application }) =>
    (projectId: string) => {
      const { spaceProviderId, spaceId } = state.projectPath[projectId];
      const { openProjects } = application;

      const workflowGroupContent = getters.getWorkflowGroupContent(projectId);

      if (workflowGroupContent === null) {
        return [];
      }

      const openProjectsFolders = openProjects
        .filter(
          ({ origin }) =>
            origin &&
            origin.providerId === spaceProviderId &&
            origin.spaceId === spaceId
        )
        .flatMap(({ origin }) => origin.ancestorItemIds);

      return workflowGroupContent.items
        .filter(
          (item) =>
            item.type === ITEM_TYPES.WorkflowGroup &&
            openProjectsFolders.includes(item.id)
        )
        .map((item) => item.id);
    },

  selectionContainsFile:
    (state, getters) => (projectId: string, selectedItemIds: string[]) => {
      const workflowGroupContent = getters.getWorkflowGroupContent(projectId);
      if (!workflowGroupContent) {
        return false;
      }
      return workflowGroupContent.items
        .filter((item) => selectedItemIds.includes(item.id))
        .some((selectedItem) => selectedItem.type === SpaceItem.TypeEnum.Data);
    },

  getWorkflowGroupContent:
    (state) =>
    (projectId: string): WorkflowGroupContent | null => {
      const pathTriplet = state.projectPath[projectId];
      if (!state.workflowGroupCache.has(pathTriplet)) {
        return null;
      }
      return state.workflowGroupCache.get(pathTriplet);
    },

  getSpaceInfo: (state) => (projectId: string) => {
    // spaces data has not been cached or providers are not yet loaded
    if (!state.projectPath.hasOwnProperty(projectId) || !state.spaceProviders) {
      return {};
    }

    const { spaceId: activeId, spaceProviderId: activeSpaceProviderId } =
      state.projectPath[projectId];

    if (activeId === "local") {
      return {
        local: true,
        private: false,
        name: "Local space",
      };
    }

    const activeSpaceProvider = state.spaceProviders[activeSpaceProviderId];
    if (!activeSpaceProvider?.spaces) {
      return {};
    }

    const space = activeSpaceProvider.spaces.find(({ id }) => id === activeId);

    if (space) {
      return {
        local: false,
        private: space.private,
        name: space.name,
      };
    }

    return {};
  },

  hasActiveHubSession({ spaceProviders }) {
    if (!spaceProviders) {
      return false;
    }

    return Boolean(
      Object.values(spaceProviders).find(
        ({ id, connected }) => id !== "local" && connected
      )
    );
  },
};
