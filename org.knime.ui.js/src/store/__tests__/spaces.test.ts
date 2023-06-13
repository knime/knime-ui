import { expect, describe, afterEach, it, vi } from "vitest";
/* eslint-disable max-lines */
import { deepMocked, mockVuexStore } from "@/test/utils";

import { API } from "@api";
import { APP_ROUTES } from "@/router/appRoutes";

import * as spacesConfig from "../spaces";
import { SpaceItemReference } from "../../api/gateway-api/generated-api";

const mockedAPI = deepMocked(API);

const fetchWorkflowGroupContentResponse = {
  id: "root",
  path: [],
  items: [
    {
      id: "1",
      name: "Folder 1",
      type: "WorkflowGroup",
    },
    {
      id: "2",
      name: "Folder 2",
      type: "WorkflowGroup",
    },
    {
      id: "4",
      name: "File 2",
      type: "Workflow",
    },
  ],
};

const fetchAllSpaceProvidersResponse = {
  local: {
    id: "local",
    connected: true,
    connectionMode: "AUTOMATIC",
    name: "Local Space",
  },
};

describe("spaces store", () => {
  const loadStore = ({
    mockFetchWorkflowGroupResponse = fetchWorkflowGroupContentResponse,
    mockFetchAllProvidersResponse = fetchAllSpaceProvidersResponse,
    openProjects = [],
    activeProjectId = "",
  } = {}) => {
    const store = mockVuexStore({
      spaces: spacesConfig,
      application: {
        state: { openProjects, activeProjectId },
        actions: { updateGlobalLoader: () => {} },
      },
    });

    store.state.spaces.projectPath.myProject1 = {
      spaceProviderId: "mockProviderId",
      spaceId: "mockSpaceId",
      itemId: "bar",
    };

    mockedAPI.desktop.fetchAllSpaceProviders.mockReturnValue(
      mockFetchAllProvidersResponse
    );
    mockedAPI.space.listWorkflowGroup.mockResolvedValue(
      mockFetchWorkflowGroupResponse
    );

    const dispatchSpy = vi.spyOn(store, "dispatch");

    return { store, dispatchSpy };
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("actions", () => {
    describe("syncPathWithOpenProjects", () => {
      it("should sync state of projectPaths with openProjects", async () => {
        const { store } = loadStore();

        // project that should be removed (not part of openProjects anymore)
        store.state.spaces.projectPath.oldProject = {
          spaceId: "space3",
          spaceProviderId: "hub2",
          itemId: "someFolder",
        };

        // currently open projects
        const openProjects: {
          projectId: string;
          origin: Omit<SpaceItemReference, "itemId">; // TODO: remove this field from the API its outdated
        }[] = [
          {
            projectId: "myProject1",
            origin: {
              providerId: "hub2",
              spaceId: "space4",
              ancestorItemIds: [],
            },
          },
          {
            projectId: "newProject3",
            origin: {
              providerId: "hub4",
              spaceId: "space6",
              ancestorItemIds: ["folderX"],
            },
          },
          {
            projectId: "newProject4",
            origin: {
              providerId: "hub4",
              spaceId: "space6",
              ancestorItemIds: [],
            },
          },
        ];

        await store.dispatch("spaces/syncPathWithOpenProjects", {
          openProjects,
        });

        // remove project
        expect(store.state.spaces.projectPath.oldProject).toBeUndefined();

        // add new project
        expect(store.state.spaces.projectPath.newProject3).toStrictEqual({
          spaceProviderId: "hub4",
          spaceId: "space6",
          itemId: "folderX",
        });

        expect(store.state.spaces.projectPath.newProject4).toStrictEqual({
          spaceProviderId: "hub4",
          spaceId: "space6",
          itemId: "root",
        });

        // does NOT update values of already open project (keep user surf state)
        expect(store.state.spaces.projectPath.myProject1).toStrictEqual({
          spaceProviderId: "mockProviderId",
          spaceId: "mockSpaceId",
          itemId: "bar",
        });
      });
    });

    describe("fetchAllSpaceProviders", () => {
      it('should set all providers in state and fetch spaces of connected "AUTOMATIC" providers', async () => {
        const mockFetchAllProvidersResponse = {
          ...fetchAllSpaceProvidersResponse,
          hub1: {
            id: "hub1",
            connected: true,
            name: "Hub 1",
            connectionMode: "AUTOMATIC",
          },
        };
        const { store } = loadStore({ mockFetchAllProvidersResponse });

        await store.dispatch("spaces/fetchAllSpaceProviders");

        expect(store.state.spaces.spaceProviders).toEqual(
          mockFetchAllProvidersResponse
        );
        expect(mockedAPI.space.getSpaceProvider).toHaveBeenCalledWith({
          spaceProviderId: "local",
        });
        expect(mockedAPI.space.getSpaceProvider).toHaveBeenCalledWith({
          spaceProviderId: "hub1",
        });
      });

      it("should keep user data set by connectProvider", async () => {
        const mockFetchAllProvidersResponse = {
          ...fetchAllSpaceProvidersResponse,
          hub1: {
            id: "hub1",
            connected: true,
            name: "Hub 1",
            connectionMode: "AUTOMATIC",
          },
        };
        const { store } = loadStore({ mockFetchAllProvidersResponse });

        const mockUser = { name: "John Doe" };
        store.state.spaces.spaceProviders = {
          hub1: {
            user: mockUser,
          },
        };

        await store.dispatch("spaces/fetchAllSpaceProviders");

        expect(store.state.spaces.spaceProviders.hub1.user).toEqual(mockUser);
      });
    });

    describe("fetchProviderSpaces", () => {
      it("should fetch spaces", async () => {
        const { store } = loadStore();
        const mockSpace = { name: "mock space", description: "" };

        store.state.spaces.spaceProviders = {
          hub1: {
            id: "hub1",
            name: "Hub 1",
          },
        };

        mockedAPI.space.getSpaceProvider.mockResolvedValue({
          spaces: [mockSpace],
        });

        const data = await store.dispatch("spaces/fetchProviderSpaces", {
          id: "hub1",
        });

        expect(mockedAPI.space.getSpaceProvider).toHaveBeenCalledWith({
          spaceProviderId: "hub1",
        });

        expect(data).toEqual(
          expect.objectContaining({
            connected: true,
            spaces: [mockSpace],
          })
        );
      });
    });

    describe("connectProvider", () => {
      it("should fetch user and provider spaces data and update state", async () => {
        const { store } = loadStore();
        const mockUser = { name: "John Doe" };
        const mockSpaces = { spaces: [{ name: "test" }] };

        store.state.spaces.spaceProviders = {
          hub1: {},
        };
        mockedAPI.space.getSpaceProvider.mockResolvedValue(mockSpaces);
        mockedAPI.desktop.connectSpaceProvider.mockReturnValue(mockUser);
        await store.dispatch("spaces/connectProvider", {
          spaceProviderId: "hub1",
        });

        expect(mockedAPI.desktop.connectSpaceProvider).toHaveBeenCalledWith({
          spaceProviderId: "hub1",
        });
        expect(mockedAPI.space.getSpaceProvider).toHaveBeenCalledWith({
          spaceProviderId: "hub1",
        });
        expect(store.state.spaces.spaceProviders.hub1.user).toEqual(mockUser);
        expect(store.state.spaces.spaceProviders.hub1.spaces).toEqual(
          mockSpaces.spaces
        );
      });

      it("should not fetch provider spaces data if the user is null", async () => {
        const { store } = loadStore();

        store.state.spaces.spaceProviders = {
          hub1: {},
        };

        mockedAPI.desktop.connectSpaceProvider.mockReturnValue(null);
        await store.dispatch("spaces/connectProvider", {
          spaceProviderId: "hub1",
        });

        expect(mockedAPI.desktop.connectSpaceProvider).toHaveBeenCalledWith({
          spaceProviderId: "hub1",
        });
        expect(mockedAPI.space.getSpaceProvider).not.toHaveBeenCalled();
      });
    });

    describe("disconnectProvider", () => {
      it("should disconnect provider and clear spaces and user data", async () => {
        const { store } = loadStore();

        const fullProvider = {
          name: "Hub 1",
          id: "hub1",
          connected: true,
          connectionMode: "AUTHENTICATED",
          user: { name: "John Doe" },
          spaces: [{ name: "mock space" }],
        };

        store.state.spaces.spaceProviders = {
          hub1: fullProvider,
        };

        const expectedProvider = {
          id: fullProvider.id,
          name: fullProvider.name,
          connectionMode: fullProvider.connectionMode,
          connected: false,
        };

        // TODO: check if projectPaths were reset to local

        await store.dispatch("spaces/disconnectProvider", {
          spaceProviderId: "hub1",
        });
        expect(store.state.spaces.spaceProviders.hub1).toEqual(
          expectedProvider
        );
      });
    });

    describe("fetchWorkflowGroupContent", () => {
      it("should fetch items correctly and set the spaceId and spaceProviderId if not set", async () => {
        const { store } = loadStore();

        await store.dispatch("spaces/fetchWorkflowGroupContent", {
          projectId: "myProject1",
        });
        expect(mockedAPI.space.listWorkflowGroup).toHaveBeenCalledWith({
          spaceProviderId: "mockProviderId",
          spaceId: "mockSpaceId",
          itemId: "bar",
        });

        expect(
          store.state.spaces.workflowGroupCache.get(
            store.state.spaces.projectPath.myProject1
          )
        ).toEqual(fetchWorkflowGroupContentResponse);
      });
    });

    describe("changeDirectory", () => {
      it("should change to another directory", async () => {
        const { store } = loadStore();

        await store.dispatch("spaces/changeDirectory", {
          projectId: "myProject1",
          pathId: "baz",
        });

        // changed project path itemId
        expect(store.state.spaces.projectPath.myProject1.itemId).toBe("baz");

        // updated cache (was not set before)
        expect(
          store.state.spaces.workflowGroupCache.has(
            store.state.spaces.projectPath.myProject1
          )
        ).toBeTruthy();

        expect(mockedAPI.space.listWorkflowGroup).toHaveBeenCalledWith(
          expect.objectContaining({ itemId: "baz" })
        );
      });

      it("should change to a parent directory", async () => {
        const { store } = loadStore();

        store.state.spaces.workflowGroupCache.set(
          store.state.spaces.projectPath.myProject1,
          { path: [{ id: "level1" }, { id: "level2" }] }
        );

        await store.dispatch("spaces/changeDirectory", {
          projectId: "myProject1",
          pathId: "..",
        });

        expect(mockedAPI.space.listWorkflowGroup).toHaveBeenCalledWith(
          expect.objectContaining({ itemId: "level1" })
        );
      });
    });

    describe("createWorkflow", () => {
      it("should create a new workflow", async () => {
        const { store, dispatchSpy } = loadStore();
        mockedAPI.space.createWorkflow.mockResolvedValue({
          id: "NewFile",
          type: "Workflow",
        });

        store.state.spaces.projectPath.project2 = {
          spaceProviderId: "local",
          spaceId: "local",
          itemId: "level2",
        };

        const workflowName = "workflow 1";

        await store.dispatch("spaces/createWorkflow", {
          projectId: "project2",
          workflowName,
        });
        expect(dispatchSpy).toHaveBeenCalledWith(
          "application/updateGlobalLoader",
          { loading: true, config: { displayMode: "transparent" } }
        );
        expect(mockedAPI.space.createWorkflow).toHaveBeenCalledWith(
          expect.objectContaining({
            spaceProviderId: "local",
            spaceId: "local",
            itemId: "level2",
            itemName: workflowName,
          })
        );
        expect(mockedAPI.space.listWorkflowGroup).toHaveBeenCalledWith(
          expect.objectContaining({ itemId: "level2" })
        );
        expect(mockedAPI.desktop.openWorkflow).toHaveBeenCalledWith({
          spaceId: "local",
          spaceProviderId: "local",
          itemId: "NewFile",
        });
        expect(dispatchSpy).toHaveBeenCalledWith(
          "application/updateGlobalLoader",
          { loading: false }
        );
      });
    });

    describe("createFolder", () => {
      it("should create a new folder", async () => {
        const { store } = loadStore();
        mockedAPI.space.createWorkflowGroup.mockResolvedValue({
          id: "NewFolder",
          type: "WorkflowGroup",
        });

        store.state.spaces.projectPath.project2 = {
          spaceProviderId: "local",
          spaceId: "local",
          itemId: "level2",
        };

        await store.dispatch("spaces/createFolder", { projectId: "project2" });
        expect(mockedAPI.space.createWorkflowGroup).toHaveBeenCalledWith(
          expect.objectContaining({ spaceId: "local", itemId: "level2" })
        );
        expect(mockedAPI.space.listWorkflowGroup).toHaveBeenCalledWith(
          expect.objectContaining({ itemId: "level2" })
        );
      });
    });

    describe("openWorkflow", () => {
      it("should open workflow", async () => {
        const { store, dispatchSpy } = loadStore();

        store.state.spaces.projectPath.project2 = {
          spaceProviderId: "local",
          spaceId: "local",
          itemId: "level2",
        };

        await store.dispatch("spaces/openWorkflow", {
          projectId: "project2",
          workflowItemId: "foobar",
        });
        expect(dispatchSpy).toHaveBeenCalledWith(
          "application/updateGlobalLoader",
          { loading: true, config: { displayMode: "transparent" } }
        );
        expect(mockedAPI.desktop.openWorkflow).toHaveBeenCalledWith({
          spaceId: "local",
          spaceProviderId: "local",
          itemId: "foobar",
        });
        expect(dispatchSpy).toHaveBeenCalledWith(
          "application/updateGlobalLoader",
          { loading: false }
        );
      });

      it("should open workflow from a different space", async () => {
        const { store } = loadStore();

        store.state.spaces.projectPath.project3 = {
          spaceProviderId: "knime1",
          spaceId: "remote1",
          itemId: "folder1",
        };

        await store.dispatch("spaces/openWorkflow", {
          workflowItemId: "foobar",
          projectId: "project3",
        });

        expect(mockedAPI.desktop.openWorkflow).toHaveBeenCalledWith({
          spaceId: "remote1",
          spaceProviderId: "knime1",
          itemId: "foobar",
        });
      });

      it("should navigate to already open workflow", async () => {
        const openProjects = [
          {
            projectId: "dummyProject",
            origin: { providerId: "local", spaceId: "local", itemId: "dummy" },
          },
        ];
        const { store } = loadStore({ openProjects });

        store.state.spaces.projectPath.project2 = {
          spaceProviderId: "local",
          spaceId: "local",
          itemId: "folder1",
        };

        const mockRouter = { push: vi.fn() };
        await store.dispatch("spaces/openWorkflow", {
          projectId: "project2",
          workflowItemId: "dummy",
          $router: mockRouter,
        });

        expect(mockedAPI.desktop.openWorkflow).not.toHaveBeenCalled();
        expect(mockRouter.push).toHaveBeenCalledWith({
          name: APP_ROUTES.WorkflowPage,
          params: { projectId: "dummyProject", workflowId: "root" },
        });
      });
    });

    describe("importToWorkflowGroup", () => {
      it("should import files", () => {
        const { store } = loadStore();

        store.state.spaces.projectPath.project2 = {
          spaceProviderId: "local",
          spaceId: "local",
          itemId: "level1",
        };

        store.dispatch("spaces/importToWorkflowGroup", {
          projectId: "project2",
          importType: "FILES",
        });
        expect(mockedAPI.desktop.importFiles).toHaveBeenCalledWith({
          itemId: "level1",
          spaceId: "local",
          spaceProviderId: "local",
        });
      });

      it("should import workflows", () => {
        const { store } = loadStore();
        store.state.spaces.projectPath.project2 = {
          spaceProviderId: "local",
          spaceId: "local",
          itemId: "level2",
        };

        store.dispatch("spaces/importToWorkflowGroup", {
          projectId: "project2",
          importType: "WORKFLOW",
        });
        expect(mockedAPI.desktop.importWorkflows).toHaveBeenCalledWith({
          itemId: "level2",
          spaceId: "local",
          spaceProviderId: "local",
        });
      });
    });

    describe("deleteItems", () => {
      it("should delete items", async () => {
        const itemIds = ["item0", "item1"];
        const { store } = loadStore();

        store.state.spaces.projectPath.project2 = {
          spaceProviderId: "local",
          spaceId: "local",
          itemId: "level2",
        };

        await store.dispatch("spaces/deleteItems", {
          projectId: "project2",
          itemIds,
        });
        expect(mockedAPI.space.deleteItems).toHaveBeenCalledWith({
          spaceId: "local",
          spaceProviderId: "local",
          itemIds,
        });
      });

      it("should re-fetch workflow group content", async () => {
        const itemIds = ["item0", "item1"];
        const projectId = "project2";

        const { store, dispatchSpy } = loadStore();
        store.state.spaces.projectPath.project2 = {
          spaceProviderId: "local",
          spaceId: "local",
          itemId: "level2",
        };

        await store.dispatch("spaces/deleteItems", { projectId, itemIds });
        expect(dispatchSpy).toHaveBeenCalledWith(
          "spaces/fetchWorkflowGroupContent",
          { projectId }
        );
      });
    });

    describe("moveItems", () => {
      it("should move items", async () => {
        const itemIds = ["id1", "id2"];
        const destWorkflowGroupItemId = "group1";
        const collisionStrategy = "OVERWRITE";

        const { store } = loadStore();

        const projectId = "project2";
        store.state.spaces.projectPath[projectId] = {
          spaceProviderId: "local",
          spaceId: "local",
          itemId: "level2",
        };

        await store.dispatch("spaces/moveItems", {
          projectId,
          itemIds,
          destWorkflowGroupItemId,
          collisionStrategy,
        });
        expect(mockedAPI.space.moveItems).toHaveBeenCalledWith({
          spaceProviderId: "local",
          spaceId: "local",
          itemIds,
          destWorkflowGroupItemId,
          collisionHandling: collisionStrategy,
        });
        expect(mockedAPI.space.listWorkflowGroup).toHaveBeenCalledWith(
          expect.objectContaining({ itemId: "level2" })
        );
      });
    });

    describe("copyBetweenSpace", () => {
      it("should copy items between spaces", async () => {
        const itemIds = ["id1", "id2"];
        const { store } = loadStore();

        const projectId = "project2";
        store.state.spaces.projectPath[projectId] = {
          spaceProviderId: "local",
          spaceId: "local",
          itemId: "level2",
        };

        await store.dispatch("spaces/copyBetweenSpaces", {
          projectId,
          itemIds,
        });
        expect(mockedAPI.desktop.copyBetweenSpaces).toHaveBeenCalledWith({
          spaceId: "local",
          spaceProviderId: "local",
          itemIds,
        });
      });
    });
  });

  describe("getters", () => {
    describe("pathToItemId", () => {
      it("should return path as itemId", () => {
        const { store } = loadStore();
        const projectId = "something";

        const result = store.getters["spaces/pathToItemId"](projectId, "baz");
        expect(result).toBe("baz");
      });

      it("should change to a parent directory", () => {
        const { store } = loadStore();

        const projectId = "project2";
        store.state.spaces.projectPath[projectId] = {
          spaceProviderId: "local",
          spaceId: "local",
          itemId: "level2",
        };
        store.state.spaces.workflowGroupCache.set(
          store.state.spaces.projectPath[projectId],
          { path: [{ id: "level1" }, { id: "level2" }] }
        );

        const result = store.getters["spaces/pathToItemId"](projectId, "..");
        expect(result).toBe("level1");
      });
    });

    describe("parentWorkflowGroupId", () => {
      it("should return the correct parent id for a root path", () => {
        const { store } = loadStore();
        const projectId = "project2";
        store.state.spaces.projectPath[projectId] = {
          spaceProviderId: "local",
          spaceId: "local",
          itemId: "level2",
        };
        store.state.spaces.workflowGroupCache.set(
          store.state.spaces.projectPath[projectId],
          { path: [] }
        );

        expect(
          store.getters["spaces/parentWorkflowGroupId"](projectId)
        ).toBeNull();
      });

      it("should return the correct parent id for a path 1 level below root", () => {
        const { store } = loadStore();
        const projectId = "project2";
        store.state.spaces.projectPath[projectId] = {
          spaceProviderId: "local",
          spaceId: "local",
          itemId: "level2",
        };
        store.state.spaces.workflowGroupCache.set(
          store.state.spaces.projectPath[projectId],
          { path: [{ id: "path1" }] }
        );

        expect(store.getters["spaces/parentWorkflowGroupId"](projectId)).toBe(
          "root"
        );
      });

      it("should return the correct parent id for a nested level", () => {
        const { store } = loadStore();
        const projectId = "project2";
        store.state.spaces.projectPath[projectId] = {
          spaceProviderId: "local",
          spaceId: "local",
          itemId: "level2",
        };
        store.state.spaces.workflowGroupCache.set(
          store.state.spaces.projectPath[projectId],
          { path: [{ id: "path1" }, { id: "path2" }] }
        );

        expect(store.getters["spaces/parentWorkflowGroupId"](projectId)).toBe(
          "path1"
        );
      });
    });

    describe("currentWorkflowGroupId", () => {
      it("should return the correct id for a root path", () => {
        const { store } = loadStore();
        const projectId = "project2";
        store.state.spaces.projectPath[projectId] = {
          spaceProviderId: "local",
          spaceId: "local",
          itemId: "level2",
        };
        store.state.spaces.workflowGroupCache.set(
          store.state.spaces.projectPath[projectId],
          { path: [] }
        );

        expect(store.getters["spaces/currentWorkflowGroupId"](projectId)).toBe(
          "root"
        );
      });

      it("should return the correct id a child path", () => {
        const { store } = loadStore();
        const projectId = "project2";
        store.state.spaces.projectPath[projectId] = {
          spaceProviderId: "local",
          spaceId: "local",
          itemId: "level2",
        };
        store.state.spaces.workflowGroupCache.set(
          store.state.spaces.projectPath[projectId],
          { path: [{ id: "path1" }] }
        );

        expect(store.getters["spaces/currentWorkflowGroupId"](projectId)).toBe(
          "path1"
        );
      });
    });

    describe("getOpenedWorkflowItems", () => {
      it("should return the opened workflow items", () => {
        const openProjects = [
          { origin: { providerId: "local", spaceId: "local", itemId: "4" } },
        ];

        const { store } = loadStore({ openProjects });
        const projectId = "project2";
        store.state.spaces.projectPath[projectId] = {
          spaceProviderId: "local",
          spaceId: "local",
          itemId: "level2",
        };
        store.state.spaces.workflowGroupCache.set(
          store.state.spaces.projectPath[projectId],
          fetchWorkflowGroupContentResponse
        );

        expect(
          store.getters["spaces/getOpenedWorkflowItems"](projectId)
        ).toEqual(["4"]);
      });
    });

    describe("getOpenedFolderItems", () => {
      it("should return the opened folder items", () => {
        const openProjects = [
          {
            origin: {
              providerId: "local",
              spaceId: "local",
              itemId: "workflowItem0",
              ancestorItemIds: ["2", "innerFolderId"],
            },
          },
          {
            origin: {
              providerId: "local",
              spaceId: "local",
              itemId: "workflowItem2",
              ancestorItemIds: ["5"],
            },
          },
        ];

        const activeWorkflowGroup = JSON.parse(
          JSON.stringify(fetchWorkflowGroupContentResponse)
        );
        activeWorkflowGroup.items.push({
          id: "5",
          name: "Folder 5",
          type: "WorkflowGroup",
        });

        const { store } = loadStore({ openProjects });

        const projectId = "project2";
        store.state.spaces.projectPath[projectId] = {
          spaceProviderId: "local",
          spaceId: "local",
          itemId: "level2",
        };
        store.state.spaces.workflowGroupCache.set(
          store.state.spaces.projectPath[projectId],
          activeWorkflowGroup
        );

        expect(store.getters["spaces/getOpenedFolderItems"](projectId)).toEqual(
          ["2", "5"]
        );
      });
    });

    describe("getSpaceInfo", () => {
      it("should return the information about the local active space", () => {
        const { store } = loadStore();
        const projectId = "project2";
        store.state.spaces.projectPath[projectId] = {
          spaceProviderId: "local",
          spaceId: "local",
          itemId: "level2",
        };
        store.state.spaces.spaceProviders = {
          local: {
            spaces: [{ id: "local" }],
          },
        };

        expect(store.getters["spaces/getSpaceInfo"](projectId)).toEqual({
          local: true,
          private: false,
          name: "Local space",
        });
      });

      it("should return the information about the private active space", () => {
        const { store } = loadStore();
        const projectId = "project2";
        store.state.spaces.projectPath[projectId] = {
          spaceProviderId: "knime1",
          spaceId: "privateSpace",
          itemId: "level2",
        };
        store.state.spaces.spaceProviders = {
          knime1: {
            spaces: [
              { id: "privateSpace", name: "Private space", private: true },
              { id: "publicSpace", name: "Public space", private: false },
            ],
          },
        };

        expect(store.getters["spaces/getSpaceInfo"](projectId)).toEqual({
          local: false,
          private: true,
          name: "Private space",
        });
      });
    });
  });
});
