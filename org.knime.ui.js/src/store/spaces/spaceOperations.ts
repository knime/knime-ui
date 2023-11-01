import type { ActionTree, GetterTree, MutationTree } from "vuex";

import { API } from "@api";
import { APP_ROUTES } from "@/router/appRoutes";
import ITEM_TYPES from "@/util/spaceItemTypes";
import { SpaceItem } from "@/api/gateway-api/generated-api";
import type { RootStoreState } from "../types";

import type { SpacesState } from "./index";

export interface PathTriplet {
  spaceId: string;
  spaceProviderId: string;
  itemId: string;
}

interface State {
  isLoadingContent: boolean;
  activeRenamedItemId: string;
}

declare module "./index" {
  interface SpacesState extends State {}
}

export const state = (): State => ({
  isLoadingContent: false,
  activeRenamedItemId: "",
});

export const mutations: MutationTree<SpacesState> = {
  setIsLoadingContent(state, value: boolean) {
    state.isLoadingContent = value;
  },

  setActiveRenamedItemId(state, value: string) {
    state.activeRenamedItemId = value;
  },
};

export const actions: ActionTree<SpacesState, RootStoreState> = {
  async fetchWorkflowGroupContentByIdTriplet(
    { commit, dispatch },
    { spaceId, spaceProviderId, itemId, retry = true },
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
      if (retry) {
        await dispatch("connectProvider", { spaceProviderId });
        const content = await dispatch("fetchWorkflowGroupContentByIdTriplet", {
          spaceId,
          spaceProviderId,
          itemId,
          retry: false,
        });

        return content;
      } else {
        consola.error("Error trying to fetch workflow group content", {
          error,
        });
        throw error;
      }
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
    { projectId, pathId },
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
        { root: true },
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
        { root: true },
      );

      // re-fetch the content of the current folder to include the created workflow (in the background)
      dispatch("fetchWorkflowGroupContent", { projectId });

      return newWorkflowItem;
    } catch (error) {
      await dispatch(
        "application/updateGlobalLoader",
        { loading: false },
        { root: true },
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
    { rootState, state, dispatch, getters },
    { workflowItemId, $router, projectId },
  ) {
    const { spaceId, spaceProviderId } = state.projectPath[projectId];
    const { openProjects } = rootState.application;
    const isLocal = getters.getSpaceInfo(projectId).local;

    const foundOpenProject = openProjects.find(
      ({ origin }) =>
        origin &&
        origin.providerId === spaceProviderId &&
        isLocal &&
        origin.spaceId === spaceId &&
        origin.itemId === workflowItemId,
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
      { root: true },
    );
    await API.desktop.openWorkflow({
      spaceProviderId,
      spaceId,
      itemId: workflowItemId,
    });
    await dispatch(
      "application/updateGlobalLoader",
      { loading: false },
      { root: true },
    );
  },

  async importToWorkflowGroup({ state, dispatch }, { projectId, importType }) {
    const { spaceId, spaceProviderId, itemId } = state.projectPath[projectId];
    const success =
      importType === "FILES"
        ? await API.desktop.importFiles({ spaceProviderId, spaceId, itemId })
        : await API.desktop.importWorkflows({
            spaceProviderId,
            spaceId,
            itemId,
          });

    if (success) {
      await dispatch("fetchWorkflowGroupContent", { projectId });
    }
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
    { projectId, itemIds, destWorkflowGroupItemId, collisionStrategy },
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
      const isLocal = getters.getSpaceInfo(projectId).local;

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
            isLocal &&
            origin.spaceId === spaceId &&
            workflowItemIds.includes(origin.itemId),
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
            origin.spaceId === spaceId,
        )
        .flatMap(({ origin }) => origin.ancestorItemIds);

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
      const workflowGroupContent = getters.getWorkflowGroupContent(projectId);
      if (!workflowGroupContent) {
        return false;
      }
      return workflowGroupContent.items
        .filter((item) => selectedItemIds.includes(item.id))
        .some((selectedItem) => selectedItem.type === SpaceItem.TypeEnum.Data);
    },

  selectionContainsWorkflow:
    (state, getters) => (projectId: string, selectedItemIds: string[]) => {
      const workflowGroupContent = getters.getWorkflowGroupContent(projectId);
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
