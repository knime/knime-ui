/* eslint-disable max-lines */
import { API } from "@api";
import { defineStore } from "pinia";
import type { Router } from "vue-router";

import type { SpaceProviderNS, WorkflowOrigin } from "@/api/custom-types";
import {
  SpaceGroup,
  SpaceItem,
  type WorkflowGroupContent,
} from "@/api/gateway-api/generated-api";
import { matchesAPIErrorCode } from "@/api/gateway-api/generated-exceptions";
import { usePromptCollisionStrategies } from "@/composables/useConfirmDialog/usePromptCollisionHandling";
import { $bus } from "@/plugins/event-bus";
import { APP_ROUTES } from "@/router/appRoutes";
import { useApplicationStore } from "@/store/application/application";
import { findSpaceGroupFromSpaceId, isProjectOpen } from "@/store/spaces/util";
import { useDesktopInteractionsStore } from "@/store/workflow/desktopInteractions";
import ITEM_TYPES from "@/util/spaceItemTypes";

import { useSpaceAuthStore } from "./auth";
import { type PathTriplet, useSpaceCachingStore } from "./caching";
import { globalSpaceBrowserProjectId } from "./common";
import { useSpaceProvidersStore } from "./providers";

type SpaceOperationsState = {
  isLoadingContent: boolean;
  activeRenamedItemId: string;
  currentSelectedItemIds: string[];
};

type MoveOrCopyItemsParams = Parameters<typeof API.space.moveOrCopyItems>[0];

export const useSpaceOperationsStore = defineStore("space.operations", {
  state: (): SpaceOperationsState => ({
    isLoadingContent: false,
    activeRenamedItemId: "",
    currentSelectedItemIds: [],
  }),
  actions: {
    setIsLoadingContent(isLoadingContent: boolean) {
      this.isLoadingContent = isLoadingContent;
    },

    setActiveRenamedItemId(activeRenamedItemId: string) {
      this.activeRenamedItemId = activeRenamedItemId;
    },

    setCurrentSelectedItemIds(itemIds: string[]) {
      this.currentSelectedItemIds = itemIds;
    },

    async fetchWorkflowGroupContentByIdTriplet({
      spaceId,
      spaceProviderId,
      itemId,
      retry = true,
    }: PathTriplet & { retry?: boolean }): Promise<WorkflowGroupContent> {
      try {
        this.setIsLoadingContent(true);

        return await API.space.listWorkflowGroup({
          spaceProviderId,
          spaceId,
          itemId,
        });
      } catch (dataFetchError) {
        if (retry) {
          const { isConnected } = await useSpaceAuthStore().connectProvider({
            spaceProviderId,
          });

          if (!isConnected) {
            throw dataFetchError;
          }

          return await this.fetchWorkflowGroupContentByIdTriplet({
            spaceId,
            spaceProviderId,
            itemId,
            retry: false,
          });
        } else {
          throw dataFetchError;
        }
      } finally {
        this.setIsLoadingContent(false);
      }
    },

    async fetchWorkflowGroupContent({
      projectId,
      retry = true,
    }: {
      projectId: string;
      retry?: boolean;
    }) {
      const pathTriplet = useSpaceCachingStore().projectPath[projectId];
      if (!pathTriplet) {
        return [];
      }

      const { spaceId, spaceProviderId, itemId } = pathTriplet;

      const content = await this.fetchWorkflowGroupContentByIdTriplet({
        spaceId,
        spaceProviderId,
        itemId,
        retry,
      });

      useSpaceCachingStore().setWorkflowGroupContent({ projectId, content });

      return content;
    },

    changeDirectory({
      projectId,
      pathId,
    }: {
      projectId: string;
      pathId: string;
    }) {
      const itemId = this.pathToItemId(projectId, pathId)!;
      useSpaceCachingStore().updateProjectPath({
        projectId,
        value: { itemId },
      });

      return { itemId };
    },

    async createSpace({
      spaceProviderId,
      spaceGroup,
      $router,
    }: {
      spaceProviderId: string;
      spaceGroup: SpaceGroup;
      $router: Router;
    }) {
      const originalProvider =
        useSpaceProvidersStore().spaceProviders![spaceProviderId];
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

        useSpaceProvidersStore().updateSpaceProvider({
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
        useSpaceProvidersStore().updateSpaceProvider({
          id: spaceProviderId,
          value: originalProvider,
        });

        throw error;
      }
    },

    async renameSpace({
      spaceProviderId,
      spaceId,
      spaceName,
    }: {
      spaceProviderId: string;
      spaceId: string;
      spaceName: string;
    }) {
      const provider =
        useSpaceProvidersStore().spaceProviders![spaceProviderId];
      try {
        const updatedGroups = provider.spaceGroups.map((group) => ({
          ...group,
          spaces: group.spaces.map((space) =>
            space.id === spaceId ? { ...space, name: spaceName } : space,
          ),
        }));

        useSpaceProvidersStore().updateSpaceProvider({
          id: spaceProviderId,
          value: { spaceGroups: updatedGroups },
        });

        await API.space.renameSpace({
          spaceProviderId,
          spaceId,
          spaceName,
        });
      } catch (error) {
        consola.error("Error while renaming space", { error });

        // Rollback to the original spaceProvider state
        useSpaceProvidersStore().updateSpaceProvider({
          id: spaceProviderId,
          value: provider,
        });

        throw error;
      }
    },

    async createWorkflow({
      projectId,
      workflowName,
    }: {
      projectId: string;
      workflowName: string;
    }) {
      const { spaceId, spaceProviderId, itemId } =
        useSpaceCachingStore().projectPath[projectId];

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
        this.fetchWorkflowGroupContent({ projectId });

        return newWorkflowItem;
      } catch (error) {
        $bus.emit("unblock-ui");
        consola.log("Error creating workflow", { error });
        throw error;
      }
    },

    async createFolder({ projectId }: { projectId: string }) {
      const { spaceId, spaceProviderId, itemId } =
        useSpaceCachingStore().projectPath[projectId];

      // Loading will be cleared after fetching the data by fetchWorkflowGroupContent
      this.setIsLoadingContent(true);

      // API call with error handling
      const newFolderItem = await API.space
        .createWorkflowGroup({
          spaceId,
          spaceProviderId,
          itemId,
        })
        .catch((error) => {
          this.setIsLoadingContent(false);
          consola.error("Error while creating folder", { error });
          throw error;
        });

      // Clears loading, might also throw but we let the exception bubble up
      await this.fetchWorkflowGroupContent({ projectId });
      this.setActiveRenamedItemId(newFolderItem.id);
      this.setCurrentSelectedItemIds([newFolderItem.id]);

      return newFolderItem;
    },

    async openProject({
      providerId,
      spaceId,
      itemId,
      $router,
    }: WorkflowOrigin & { $router?: Router }) {
      const provider = useSpaceProvidersStore().spaceProviders[providerId];

      if (!provider) {
        consola.error(
          "Unexpected error: Tried to open a project from an unknown provider.",
        );
        return;
      }

      const foundOpenProject = useApplicationStore().openProjects.find(
        (project) =>
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
      } catch (error) {
        consola.error(
          `Error openProject providerId: ${providerId} spaceId: ${spaceId} itemId: ${itemId}`,
          providerId,
          spaceId,
          itemId,
          error,
        );
        throw error;
      } finally {
        $bus.emit("unblock-ui");
      }
    },

    async importToWorkflowGroup({
      projectId,
      importType,
    }: {
      projectId: string;
      importType: "WORKFLOW" | "FILES";
    }) {
      const { spaceId, spaceProviderId, itemId } =
        useSpaceCachingStore().projectPath[projectId];
      const importedItems =
        importType === "FILES"
          ? await API.desktop.importFiles({ spaceProviderId, spaceId, itemId })
          : await API.desktop.importWorkflows({
              spaceProviderId,
              spaceId,
              itemId,
            });

      if (importedItems !== null && importedItems.length > 0) {
        await this.fetchWorkflowGroupContent({ projectId });
      }
      return importedItems;
    },

    async exportSpaceItem({
      projectId,
      itemId,
    }: {
      projectId: string;
      itemId: string;
    }) {
      const { spaceId, spaceProviderId } =
        useSpaceCachingStore().projectPath[projectId];
      const success = await API.desktop.exportSpaceItem({
        spaceProviderId,
        spaceId,
        itemId,
      });

      if (success) {
        await this.fetchWorkflowGroupContent({ projectId });
      }
    },

    async renameItem({
      projectId,
      itemId,
      newName,
    }: {
      projectId: string;
      itemId: string;
      newName: string;
    }) {
      const { spaceId, spaceProviderId } =
        useSpaceCachingStore().projectPath[projectId];

      try {
        // loading is cleared after data is fetched by fetchWorkflowGroupContent
        this.setIsLoadingContent(true);
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

        await this.fetchWorkflowGroupContent({ projectId });
      } catch (error) {
        this.setIsLoadingContent(false);
        consola.log("Error renaming item", { error });
        throw error;
      }
    },

    async deleteItems({
      projectId,
      itemIds,
      $router,
    }: {
      projectId: string;
      itemIds: string[];
      $router: Router;
    }) {
      try {
        const { spaceId, spaceProviderId } =
          useSpaceCachingStore().projectPath[projectId];

        const provider =
          useSpaceProvidersStore().getProviderInfoFromProjectPath(
            projectId,
          ) as SpaceProviderNS.SpaceProvider;

        const origins = itemIds.map<WorkflowOrigin>((itemId) => ({
          providerId: provider.id,
          spaceId,
          itemId,
        }));

        // find if among the items being deleted some pertain to currently open projects
        const openProjectIds = useApplicationStore()
          .openProjects.filter((project) =>
            origins.some((origin) => isProjectOpen(project, origin, provider)),
          )
          .map(({ projectId }) => projectId);

        const isDeletingOpenProjects = openProjectIds.length > 0;

        // when open projects are being deleted we must force close them first.
        // this in-turn will return which is the project that should be active after deletion
        const nextProjectId = isDeletingOpenProjects
          ? await useDesktopInteractionsStore().forceCloseProjects({
              projectIds: openProjectIds,
            })
          : null;

        const isDeletingActiveProject = isDeletingOpenProjects
          ? openProjectIds.includes(projectId)
          : false;

        // loading is cleared after data is fetched by fetchWorkflowGroupContent
        this.setIsLoadingContent(true);
        this.setActiveRenamedItemId("");

        const { canSoftDelete } = this.getDeletionInfo(projectId);

        await API.space.deleteItems({
          spaceProviderId,
          spaceId,
          itemIds,
          softDelete: canSoftDelete,
        });
        await this.fetchWorkflowGroupContent({
          projectId: isDeletingActiveProject
            ? // if the active project is being deleted activate the next project
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
        this.setIsLoadingContent(false);
        consola.log("Error deleting item", { error });
        throw error;
      }
    },

    async moveOrCopyItems({
      projectId,
      itemIds,
      destWorkflowGroupItemId,
      collisionHandling,
      isCopy,
    }: {
      projectId: string;
      itemIds: string[];
      destWorkflowGroupItemId: string;
      collisionHandling?: "NOOP" | "OVERWRITE" | "AUTORENAME";
      isCopy: boolean;
    }) {
      const { spaceId, spaceProviderId } =
        useSpaceCachingStore().projectPath[projectId];

      try {
        this.setIsLoadingContent(true);
        await this.checkForCollisionsAndMove({
          spaceProviderId,
          spaceId,
          itemIds,
          destSpaceId: spaceId,
          destWorkflowGroupItemId,
          ...(collisionHandling && { collisionHandling }),
          copy: isCopy,
        });
        itemIds.forEach(async (itemId: string) => {
          await API.desktop.updateMostRecentlyUsedProject({
            spaceProviderId,
            spaceId,
            itemId,
          });
        });
        await this.fetchWorkflowGroupContent({ projectId });
      } catch (error) {
        const copyOrMoveText = isCopy ? "copying" : "moving";
        consola.log(`Error ${copyOrMoveText} items`, {
          error,
        });
        throw error;
      } finally {
        this.setIsLoadingContent(false);
      }
    },

    /**
     * Opens the permission dialog for Server items
     *
     * @param projectId
     * @param itemId
     */
    openPermissionsDialog({
      projectId,
      itemId,
    }: {
      projectId: string;
      itemId: string;
    }) {
      const { spaceId, spaceProviderId } =
        useSpaceCachingStore().projectPath[projectId];
      API.desktop.openPermissionsDialog({ spaceProviderId, spaceId, itemId });
    },

    /**
     * Try moving items. If there is no collision strategy set, the user will be prompted
     * for choosing a collision strategy in case of failure and the request will be retried with the
     * chosen collision strategy
     * @param params the params for the moveOrCopyItems call on the gateway space api
     * @returns
     */
    async checkForCollisionsAndMove(params: MoveOrCopyItemsParams) {
      const { promptCollisionStrategies } = usePromptCollisionStrategies();

      try {
        await API.space.moveOrCopyItems(params);
      } catch (error) {
        // retry with collision strategy if there is a collision
        if (
          !params?.collisionHandling &&
          matchesAPIErrorCode(error, "CollisionException")
        ) {
          const collisionHandling = await promptCollisionStrategies();
          if (collisionHandling === "CANCEL") {
            return;
          }
          await this.checkForCollisionsAndMove({
            ...params,
            collisionHandling,
          });
          return;
        }

        throw error;
      }
    },
  },
  getters: {
    getDeletionInfo: () => (projectId: string) => {
      const providersStore = useSpaceProvidersStore();
      if (
        !useSpaceCachingStore().projectPath.hasOwnProperty(projectId) ||
        !providersStore.spaceProviders
      ) {
        return { canSoftDelete: false, groupName: null };
      }

      const { spaceId } = useSpaceCachingStore().projectPath[projectId];

      const group = findSpaceGroupFromSpaceId(
        providersStore.spaceProviders,
        spaceId,
      );
      return {
        canSoftDelete: group?.canSoftDelete ?? false,
        groupName: group?.name ?? null,
      };
    },
    pathToItemId() {
      return (projectId: string, pathId: string) => {
        // going back
        if (pathId === "..") {
          return this.parentWorkflowGroupId(projectId);
        }
        // current folder
        if (pathId === ".") {
          return this.currentWorkflowGroupId(projectId);
        }
        // no special char just consider pathId an itemId
        return pathId;
      };
    },

    parentWorkflowGroupId:
      () =>
      (projectId: string): string | null => {
        const workflowGroupContent =
          useSpaceCachingStore().getWorkflowGroupContent(projectId);

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

    currentWorkflowGroupId: () => (projectId: string) => {
      const workflowGroupContent =
        useSpaceCachingStore().getWorkflowGroupContent(projectId);

      if (workflowGroupContent === null) {
        return null;
      }

      const { path } = workflowGroupContent;
      return path.length > 0 ? path[path.length - 1].id : "root";
    },

    getOpenedWorkflowItems: () => (pathKey: string) => {
      const workflowGroupContent =
        useSpaceCachingStore().getWorkflowGroupContent(pathKey);

      if (workflowGroupContent === null) {
        return [];
      }

      // provider and spaceId must be derived from the given path key
      const { spaceId } = useSpaceCachingStore().projectPath[pathKey];
      const provider = useSpaceProvidersStore().getProviderInfoFromProjectPath(
        pathKey,
      ) as SpaceProviderNS.SpaceProvider;

      return useApplicationStore()
        .openProjects.filter((project) =>
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

    getOpenedFolderItems: () => (pathKey: string) => {
      const workflowGroupContent =
        useSpaceCachingStore().getWorkflowGroupContent(pathKey);

      if (workflowGroupContent === null) {
        return [];
      }

      // provider and spaceId must be derived from the given path key
      const { spaceId } = useSpaceCachingStore().projectPath[pathKey];
      const provider = useSpaceProvidersStore().getProviderInfoFromProjectPath(
        pathKey,
      ) as SpaceProviderNS.SpaceProvider;

      const openProjectsFolders = useApplicationStore()
        .openProjects.filter((project) =>
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
      () => (projectId: string, selectedItemIds: string[]) => {
        const workflowGroupContent =
          useSpaceCachingStore().getWorkflowGroupContent(projectId);
        if (!workflowGroupContent) {
          return false;
        }

        return workflowGroupContent.items
          .filter((item) => selectedItemIds.includes(item.id))
          .some(
            (selectedItem) => selectedItem.type === SpaceItem.TypeEnum.Data,
          );
      },

    selectionContainsWorkflow:
      () => (projectId: string, selectedItemIds: string[]) => {
        const workflowGroupContent =
          useSpaceCachingStore().getWorkflowGroupContent(projectId);
        if (!workflowGroupContent) {
          return false;
        }

        return workflowGroupContent.items
          .filter((item) => selectedItemIds.includes(item.id))
          .some(
            (selectedItem) => selectedItem.type === SpaceItem.TypeEnum.Workflow,
          );
      },
  },
});
