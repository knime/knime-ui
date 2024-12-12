/* eslint-disable max-lines */
import type { Router } from "vue-router";
import type { ActionTree, GetterTree, MutationTree } from "vuex";

import { API } from "@/api";
import type { SpaceProviderNS, WorkflowOrigin } from "@/api/custom-types";
import { StoreActionException } from "@/api/gateway-api/exceptions";
import {
  NetworkException,
  ServiceCallException,
  SpaceGroup,
  SpaceItem,
  type WorkflowGroupContent,
} from "@/api/gateway-api/generated-api";
import { $bus } from "@/plugins/event-bus";
import { getToastsProvider } from "@/plugins/toasts";
import { APP_ROUTES } from "@/router/appRoutes";
import ITEM_TYPES from "@/util/spaceItemTypes";
import type { RootStoreState } from "../types";

import { globalSpaceBrowserProjectId } from "./common";
import type { SpacesState } from "./index";
import { isHubProvider, isProjectOpen } from "./util";

const $toast = getToastsProvider();

export interface PathTriplet {
  spaceId: string;
  spaceProviderId: string;
  itemId: string;
}

interface State {
  isLoadingContent: boolean;
  activeRenamedItemId: string;
  currentSelectedItemIds: string[];
  currentSubscription: PathTriplet | null;
}

declare module "./index" {
  interface SpacesState extends State {}
}

export const state = (): State => ({
  isLoadingContent: false,
  activeRenamedItemId: "",
  currentSelectedItemIds: [],
  currentSubscription: null,
});

export const mutations: MutationTree<SpacesState> = {
  setIsLoadingContent(state, value: boolean) {
    state.isLoadingContent = value;
  },

  setActiveRenamedItemId(state, value: string) {
    state.activeRenamedItemId = value;
  },

  setCurrentSelectedItemIds(state, itemIds) {
    state.currentSelectedItemIds = itemIds;
  },

  setCurrentSubscription(state, triplet: PathTriplet) {
    state.currentSubscription = triplet;
  },
};

// #region:actions
export const actions: ActionTree<SpacesState, RootStoreState> = {
  async fetchWorkflowGroupContentByIdTriplet(
    { commit, dispatch },
    { spaceId, spaceProviderId, itemId, retry = true },
  ) {
    try {
      commit("setIsLoadingContent", true);
      const content = await API.space
        .listWorkflowGroup({
          spaceProviderId,
          spaceId,
          itemId,
        })
        .catch((error) => {
          if (error instanceof ServiceCallException) {
            throw new StoreActionException(
              "Error while fetching workflow group content",
              error,
            );
          }
          if (error instanceof NetworkException) {
            throw new StoreActionException("Connectivity problem", error);
          }

          throw error;
        });

      return content;
    } catch (dataFetchError) {
      if (retry) {
        const { isConnected } = await dispatch("connectProvider", {
          spaceProviderId,
        });

        if (!isConnected) {
          throw dataFetchError;
        }

        const content = await dispatch("fetchWorkflowGroupContentByIdTriplet", {
          spaceId,
          spaceProviderId,
          itemId,
          retry: false,
        });

        return content;
      } else {
        consola.error("Error trying to fetch workflow group content", {
          error: dataFetchError,
        });
        throw dataFetchError;
      }
    } finally {
      commit("setIsLoadingContent", false);
    }
  },

  async fetchWorkflowGroupContent({ commit, state, dispatch }, { projectId }) {
    consola.info("Fetching workflow group content", { projectId });
    const pathTriplet = state.projectPath[projectId];
    if (!pathTriplet) {
      return [];
    }

    const content = await dispatch(
      "fetchWorkflowGroupContentByIdTriplet",
      pathTriplet,
    );
    commit("setWorkflowGroupContent", { projectId, content });

    return content;
  },

  /**
   * Get notified when a resource has changed. The currently active subscription will be saved.
   *
   * @param projectId Indicates the currently active tab
   */
  subscribeResourceChangedEventListener({ commit, state }, { projectId }) {
    const pathTriplet = state.projectPath[projectId];
    if (!pathTriplet) {
      return;
    }

    const { spaceId, spaceProviderId: providerId, itemId } = pathTriplet;
    const currentProvider = state.spaceProviders![providerId];

    // Currently only Hub providers are of interest
    if (isHubProvider(currentProvider)) {
      API.event.subscribeEvent({
        providerId,
        spaceId,
        itemId,
        typeId: "HubResourceChangedEventType",
      });

      commit("setCurrentSubscription", pathTriplet);
    }
  },

  /**
   * Unsubscribe from the currently active resource changed event listener.
   */
  unsubscribeResourceChangedEventListener({ state }) {
    if (state.currentSubscription) {
      const { spaceProviderId, spaceId, itemId } = state.currentSubscription;
      API.event.unsubscribeEventListener({
        providerId: spaceProviderId,
        spaceId,
        itemId,
        typeId: "HubResourceChangedEventType",
      });
    }
  },

  changeDirectory({ getters, commit }, { projectId, pathId }) {
    const itemId = getters.pathToItemId(projectId, pathId);
    commit("updateProjectPath", { projectId, value: { itemId } });
    return { itemId };
  },

  async createSpace(
    { commit, state },
    {
      spaceProviderId,
      spaceGroup,
      $router,
    }: { spaceProviderId: string; spaceGroup: SpaceGroup; $router: Router },
  ) {
    const originalProvider = state.spaceProviders![spaceProviderId];
    const routeBefore = $router.currentRoute.value.fullPath;

    try {
      const newSpace = await API.space.createSpace({
        spaceProviderId,
        spaceGroupName: spaceGroup.name,
      });

      const updatedGroups = originalProvider.spaceGroups.map((group) =>
        group.id === spaceGroup.id
          ? { ...group, spaces: [...group.spaces, newSpace] }
          : group,
      );

      commit("updateSpaceProvider", {
        id: spaceProviderId,
        value: { ...originalProvider, spaceGroups: updatedGroups },
      });

      const routeNow = $router.currentRoute.value.fullPath;

      if (routeBefore === routeNow) {
        $router.push({
          name: APP_ROUTES.Home.SpaceBrowsingPage,
          params: {
            spaceProviderId,
            groupId: spaceGroup.id,
            spaceId: newSpace.id,
            itemId: "root",
          },
        });
      }
    } catch (error) {
      consola.error("Error while creating space", { error });

      // rollback the space providers state
      commit("updateSpaceProvider", {
        id: spaceProviderId,
        value: originalProvider,
      });

      throw error;
    }
  },

  async renameSpace(
    { commit, state },
    { spaceProviderId, spaceId, spaceName },
  ) {
    const provider = state.spaceProviders![spaceProviderId];
    try {
      const updatedGroups = provider.spaceGroups.map((group) => ({
        ...group,
        spaces: group.spaces.map((space) =>
          space.id === spaceId ? { ...space, name: spaceName } : space,
        ),
      }));

      commit("updateSpaceProvider", {
        id: spaceProviderId,
        value: { spaceGroups: updatedGroups },
      });

      await API.space.renameSpace({
        spaceProviderId,
        spaceId,
        spaceName,
      });
      return Promise.resolve();
    } catch (error) {
      $toast.show({
        type: "error",
        headline: "Error while renaming space",
        // @ts-ignore
        message: error.message,
        autoRemove: true,
      });
      consola.error("Error while renaming space", { error });

      // Rollback to the original spaceProvider state
      commit("updateSpaceProvider", {
        id: spaceProviderId,
        value: provider,
      });

      return Promise.reject(error);
    }
  },

  async createWorkflow({ state, dispatch }, { projectId, workflowName }) {
    const { spaceId, spaceProviderId, itemId } = state.projectPath[projectId];

    try {
      // use global block-ui because just using the local one for the space explorer
      // is not enough since createWorkflow would also open a new workflow instead of just
      // doing a local operation like fetching data or renaming
      $bus.emit("block-ui");
      const newWorkflowItem = await API.space.createWorkflow({
        spaceProviderId,
        spaceId,
        itemId,
        itemName: workflowName,
      });
      $bus.emit("unblock-ui");

      // re-fetch the content of the current folder to include the created workflow (in the background)
      dispatch("fetchWorkflowGroupContent", { projectId });

      return newWorkflowItem;
    } catch (error) {
      $bus.emit("unblock-ui");
      consola.log("Error creating workflow", { error });
      throw error;
    }
  },

  async createFolder({ dispatch, state, commit }, { projectId }) {
    const { spaceId, spaceProviderId, itemId } = state.projectPath[projectId];
    // Loading will be cleared after fetching the data by fetchWorkflowGroupContent
    commit("setIsLoadingContent", true);

    // API call with error handling
    const newFolderItem = await API.space
      .createWorkflowGroup({
        spaceId,
        spaceProviderId,
        itemId,
      })
      .catch((error) => {
        const message = "Error while creating folder";
        commit("setIsLoadingContent", false);
        consola.error(message, { error });

        if (error instanceof ServiceCallException) {
          throw new StoreActionException("Error while creating folder", error);
        }

        throw error;
      });

    // Clears loading, might also throw but we let the exception bubble up
    await dispatch("fetchWorkflowGroupContent", { projectId });
    commit("setActiveRenamedItemId", newFolderItem.id);
    commit("setCurrentSelectedItemIds", [newFolderItem.id]);
    return newFolderItem;
  },

  async openProject(
    { rootState, state },
    {
      providerId,
      spaceId,
      itemId,
      $router,
    }: WorkflowOrigin & { $router?: Router },
  ) {
    const provider = (state.spaceProviders ?? {})[providerId];
    const { openProjects } = rootState.application;

    const foundOpenProject = openProjects.find((project) =>
      isProjectOpen(project, { spaceId, providerId, itemId }, provider),
    );

    if (foundOpenProject) {
      $router?.push({
        name: APP_ROUTES.WorkflowPage,
        params: { workflowId: "root", projectId: foundOpenProject.projectId },
      });

      return;
    }

    // use global block-ui because just using the local one for the space explorer
    // is not enough since 'openProject' would open a new project instead of just
    // doing a local operation like fetching data or renaming
    $bus.emit("block-ui");

    try {
      // Async call to indicate that this function might take a while
      await API.desktop.openProject({
        spaceProviderId: providerId,
        spaceId,
        itemId,
      });
    } finally {
      $bus.emit("unblock-ui");
    }
  },

  async importToWorkflowGroup({ state, dispatch }, { projectId, importType }) {
    const { spaceId, spaceProviderId, itemId } = state.projectPath[projectId];
    const importedItems =
      importType === "FILES"
        ? await API.desktop.importFiles({ spaceProviderId, spaceId, itemId })
        : await API.desktop.importWorkflows({
            spaceProviderId,
            spaceId,
            itemId,
          });

    if (importedItems !== null && importedItems.length > 0) {
      await dispatch("fetchWorkflowGroupContent", { projectId });
    }
    return importedItems;
  },

  async exportSpaceItem({ state, dispatch }, { projectId, itemId }) {
    const { spaceId, spaceProviderId } = state.projectPath[projectId];
    const success = await API.desktop.exportSpaceItem({
      spaceProviderId,
      spaceId,
      itemId,
    });

    if (success) {
      await dispatch("fetchWorkflowGroupContent", { projectId });
    }
  },

  async renameItem(
    { state, dispatch, commit },
    { projectId, itemId, newName },
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

      await API.desktop.updateMostRecentlyUsedProject({
        spaceProviderId,
        spaceId,
        itemId,
        newName,
      });

      await dispatch("fetchWorkflowGroupContent", { projectId });
    } catch (error) {
      commit("setIsLoadingContent", false);
      consola.log("Error renaming item", { error });
      throw error;
    }
  },

  async deleteItems(
    { dispatch, commit, state, rootState, getters },
    {
      projectId,
      itemIds,
      $router,
    }: { projectId: string; itemIds: string[]; $router: Router },
  ) {
    try {
      const { spaceId, spaceProviderId } = state.projectPath[projectId];
      const provider: SpaceProviderNS.SpaceProvider =
        getters.getProviderInfoFromProjectPath(projectId);
      const { openProjects } = rootState.application;

      const origins = itemIds.map<WorkflowOrigin>((itemId) => ({
        providerId: provider.id,
        spaceId,
        itemId,
      }));

      // find if among the items being deleted some pertain to currently open projects
      const openProjectIds = openProjects
        .filter((project) =>
          origins.some((origin) => isProjectOpen(project, origin, provider)),
        )
        .map(({ projectId }) => projectId);

      const isDeletingOpenProjects = openProjectIds.length > 0;

      // when open projects are being deleted we must force close them first.
      // this in-turn will return which is the project that should be active after deletion
      const nextProjectId = isDeletingOpenProjects
        ? await dispatch(
            "application/forceCloseProjects",
            { projectIds: openProjectIds },
            { root: true },
          )
        : null;

      const isDeletingActiveProject = isDeletingOpenProjects
        ? openProjectIds.includes(projectId)
        : false;

      // loading is cleared after data is fetched by fetchWorkflowGroupContent
      commit("setIsLoadingContent", true);
      commit("setActiveRenamedItemId", "");

      await API.space.deleteItems({ spaceProviderId, spaceId, itemIds });
      await dispatch("fetchWorkflowGroupContent", {
        projectId: isDeletingActiveProject
          ? // if the active project is beind deleted activate the next project
            // with a fallback to the global space browser
            nextProjectId ?? globalSpaceBrowserProjectId
          : // otherwise simply refresh the current space
            projectId,
      });

      // navigate to the next workflow (if any) to set it as active
      if (nextProjectId) {
        await $router.push({
          name: APP_ROUTES.WorkflowPage,
          params: { projectId: nextProjectId, workflowId: "root" },
        });
      }
    } catch (error) {
      commit("setIsLoadingContent", false);
      consola.log("Error deleting item", { error });
      throw error;
    }
  },

  async moveOrCopyItems(
    { state, dispatch, commit },
    { projectId, itemIds, destWorkflowGroupItemId, collisionStrategy, isCopy },
  ) {
    const { spaceId, spaceProviderId } = state.projectPath[projectId];

    try {
      commit("setIsLoadingContent", true);
      await API.space.moveOrCopyItems({
        spaceProviderId,
        spaceId,
        itemIds,
        destWorkflowGroupItemId,
        collisionHandling: collisionStrategy,
        copy: isCopy,
      });
      itemIds.forEach(async (itemId: string) => {
        await API.desktop.updateMostRecentlyUsedProject({
          spaceProviderId,
          spaceId,
          itemId,
        });
      });
      await dispatch("fetchWorkflowGroupContent", { projectId });
    } catch (error) {
      const copyOrMoveText = isCopy ? "copying" : "moving";
      consola.log(`Error ${copyOrMoveText} items`, {
        error,
      });
      throw error;
    } finally {
      commit("setIsLoadingContent", false);
    }
  },

  /**
   * Opens the permission dialog for Server items
   *
   * @param projectId
   * @param itemId
   */
  openPermissionsDialog({ state }, { projectId, itemId }) {
    const { spaceId, spaceProviderId } = state.projectPath[projectId];
    API.desktop.openPermissionsDialog({ spaceProviderId, spaceId, itemId });
  },
};

// #region:getters
export const getters: GetterTree<SpacesState, RootStoreState> = {
  pathToItemId: (_, getters) => (projectId: string, pathId: string) => {
    // going back
    if (pathId === "..") {
      return getters.parentWorkflowGroupId(projectId);
    }
    // current folder
    if (pathId === ".") {
      return getters.currentWorkflowGroupId(projectId);
    }
    // no special char just consider pathId an itemId
    return pathId;
  },

  parentWorkflowGroupId:
    (state, getters) =>
    (projectId: string): string | null => {
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
    (pathKey: string) => {
      const { openProjects } = application;
      const workflowGroupContent: WorkflowGroupContent =
        getters.getWorkflowGroupContent(pathKey);

      if (workflowGroupContent === null) {
        return [];
      }

      // provider and spaceId must be derived from the given path key
      const { spaceId } = state.projectPath[pathKey];
      const provider: SpaceProviderNS.SpaceProvider =
        getters.getProviderInfoFromProjectPath(pathKey);

      return openProjects
        .filter((project) =>
          isProjectOpen(
            project,
            {
              providerId: provider.id,
              spaceId,
              itemId: project.origin?.itemId ?? "",
            },
            provider,
          ),
        )
        .map(({ origin }) => origin?.itemId);
    },

  getOpenedFolderItems:
    (state, getters, { application }) =>
    (pathKey: string) => {
      const { openProjects } = application;

      const workflowGroupContent: WorkflowGroupContent =
        getters.getWorkflowGroupContent(pathKey);

      if (workflowGroupContent === null) {
        return [];
      }

      // provider and spaceId must be derived from the given path key
      const { spaceId } = state.projectPath[pathKey];
      const provider: SpaceProviderNS.SpaceProvider =
        getters.getProviderInfoFromProjectPath(pathKey);

      const openProjectsFolders = openProjects
        .filter((project) =>
          isProjectOpen(
            project,
            {
              providerId: provider.id,
              spaceId,
              itemId: project.origin?.itemId ?? "",
            },
            provider,
          ),
        )
        .flatMap(({ origin }) => origin?.ancestorItemIds ?? []);

      return workflowGroupContent.items
        .filter(
          (item) =>
            item.type === ITEM_TYPES.WorkflowGroup &&
            openProjectsFolders.includes(item.id),
        )
        .map((item) => item.id);
    },

  selectionContainsFile:
    (state, getters) => (projectId: string, selectedItemIds: string[]) => {
      const workflowGroupContent: WorkflowGroupContent =
        getters.getWorkflowGroupContent(projectId);
      if (!workflowGroupContent) {
        return false;
      }

      return workflowGroupContent.items
        .filter((item) => selectedItemIds.includes(item.id))
        .some((selectedItem) => selectedItem.type === SpaceItem.TypeEnum.Data);
    },

  selectionContainsWorkflow:
    (state, getters) => (projectId: string, selectedItemIds: string[]) => {
      const workflowGroupContent: WorkflowGroupContent =
        getters.getWorkflowGroupContent(projectId);
      if (!workflowGroupContent) {
        return false;
      }

      return workflowGroupContent.items
        .filter((item) => selectedItemIds.includes(item.id))
        .some(
          (selectedItem) => selectedItem.type === SpaceItem.TypeEnum.Workflow,
        );
    },
};
