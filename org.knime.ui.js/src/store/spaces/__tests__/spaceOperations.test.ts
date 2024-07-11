/* eslint-disable max-lines */
import { afterEach, describe, expect, it, vi } from "vitest";

import { API } from "@api";
import { APP_ROUTES } from "@/router/appRoutes";
import { deepMocked, mockedObject } from "@/test/utils";
import { fetchWorkflowGroupContentResponse, loadStore } from "./loadStore";
import {
  createSpace,
  createSpaceProvider,
  createProject,
} from "@/test/factories";
import { $bus } from "@/plugins/event-bus";
import { getToastsProvider } from "@/plugins/toasts";

const busEmitSpy = vi.spyOn($bus, "emit");
const mockedAPI = deepMocked(API);
const toast = mockedObject(getToastsProvider());

describe("spaces::spaceOperations", () => {
  afterEach(() => {
    vi.clearAllMocks();
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
          JSON.stringify(store.state.spaces.projectPath.myProject1),
        ),
      ).toEqual(fetchWorkflowGroupContentResponse);
    });

    it("should retry fetch once", async () => {
      const { store } = loadStore();

      store.state.spaces.spaceProviders = {
        // @ts-ignore
        hub1: {},
      };

      const mockSpaceProvider = createSpaceProvider({
        id: "hub1",
        connected: true,
        user: { name: "John Doe" },
      });
      mockedAPI.desktop.connectSpaceProvider.mockResolvedValueOnce(
        mockSpaceProvider,
      );

      mockedAPI.space.listWorkflowGroup.mockRejectedValueOnce(
        new Error("Error fetching content"),
      );

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
          JSON.stringify(store.state.spaces.projectPath.myProject1),
        ),
      ).toEqual(fetchWorkflowGroupContentResponse);
    });

    it("should throw if it fails more than once", () => {
      const { store } = loadStore();

      // mute consola
      consola.error = () => {};

      store.state.spaces.spaceProviders = {
        // @ts-ignore
        hub1: {},
      };

      const mockSpaceProvider = createSpaceProvider({
        id: "hub1",
        connected: true,
        user: { name: "John Doe" },
      });
      mockedAPI.desktop.connectSpaceProvider.mockResolvedValueOnce(
        mockSpaceProvider,
      );

      mockedAPI.space.listWorkflowGroup
        .mockRejectedValueOnce(new Error("Error fetching content first time"))
        .mockRejectedValueOnce(new Error("Error fetching content second time"));

      expect(() =>
        store.dispatch("spaces/fetchWorkflowGroupContent", {
          projectId: "myProject1",
        }),
      ).rejects.toThrow("Error fetching content second time");
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
    });

    it("should change to a parent directory", async () => {
      const { store } = loadStore();

      store.state.spaces.workflowGroupCache.set(
        JSON.stringify(store.state.spaces.projectPath.myProject1),
        // @ts-ignore
        { path: [{ id: "level1" }, { id: "level2" }] },
      );

      await store.dispatch("spaces/changeDirectory", {
        projectId: "myProject1",
        pathId: "..",
      });

      expect(store.state.spaces.projectPath.myProject1.itemId).toBe("level1");
    });
  });

  describe("createWorkflow", () => {
    it("should create a new workflow", async () => {
      const { store } = loadStore();
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

      expect(busEmitSpy).toHaveBeenCalledWith("block-ui");

      expect(mockedAPI.space.createWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          spaceProviderId: "local",
          spaceId: "local",
          itemId: "level2",
          itemName: workflowName,
        }),
      );
      expect(mockedAPI.space.listWorkflowGroup).toHaveBeenCalledWith(
        expect.objectContaining({ itemId: "level2" }),
      );
      expect(busEmitSpy).toHaveBeenCalledWith("unblock-ui");
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
      expect(store.state.spaces.activeRenamedItemId).toBe("NewFolder");
      expect(mockedAPI.space.createWorkflowGroup).toHaveBeenCalledWith(
        expect.objectContaining({ spaceId: "local", itemId: "level2" }),
      );
      expect(mockedAPI.space.listWorkflowGroup).toHaveBeenCalledWith(
        expect.objectContaining({ itemId: "level2" }),
      );
    });
  });

  describe("openProject", () => {
    it("should open workflow", async () => {
      const { store } = loadStore();

      store.state.spaces.projectPath.project2 = {
        spaceProviderId: "local",
        spaceId: "local",
        itemId: "level2",
      };

      await store.dispatch("spaces/openProject", {
        providerId: "local",
        spaceId: "local",
        itemId: "foobar",
      });

      expect(busEmitSpy).toHaveBeenCalledWith("block-ui");

      expect(mockedAPI.desktop.openProject).toHaveBeenCalledWith({
        spaceId: "local",
        spaceProviderId: "local",
        itemId: "foobar",
      });

      expect(busEmitSpy).toHaveBeenCalledWith("unblock-ui");
    });

    it("should fail to open workflow", async () => {
      const { store } = loadStore();

      store.state.spaces.projectPath.project2 = {
        spaceProviderId: "local",
        spaceId: "local",
        itemId: "something",
      };

      mockedAPI.desktop.openProject.mockRejectedValue(
        "Could not open workflow",
      );

      await expect(() =>
        store.dispatch("spaces/openProject", {
          providerId: "local",
          spaceId: "local",
          itemId: "foobar",
        }),
      ).rejects.toThrow("Could not open workflow");
    });

    it("should show toast when failing to open workflow", async () => {
      const { store } = loadStore();

      store.state.spaces.projectPath.project2 = {
        spaceProviderId: "local",
        spaceId: "local",
        itemId: "something",
      };

      mockedAPI.desktop.openProject.mockRejectedValue(
        "Workflow could not be read",
      );

      try {
        await store.dispatch("spaces/openProject", {
          providerId: "local",
          spaceId: "local",
          itemId: "foobar",
        });
      } catch (error) {
        expect(toast.show).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "warning",
            headline: "Could not open workflow",
            message: `${error}`,
          }),
        );
      }
    });

    it("should navigate to already open workflow", async () => {
      const openProjects = [
        createProject({
          projectId: "dummyProject",
          origin: { providerId: "local", spaceId: "local", itemId: "dummy" },
        }),
      ];
      const { store } = loadStore({ openProjects });

      store.state.spaces.projectPath.project2 = {
        spaceProviderId: "local",
        spaceId: "local",
        itemId: "folder1",
      };

      store.commit("spaces/setSpaceProviders", {
        local: createSpaceProvider(),
      });

      const mockRouter = { push: vi.fn() };

      await store.dispatch("spaces/openProject", {
        providerId: "local",
        spaceId: "local",
        itemId: "dummy",
        $router: mockRouter,
      });

      expect(mockedAPI.desktop.openProject).not.toHaveBeenCalled();
      expect(mockRouter.push).toHaveBeenCalledWith({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId: "dummyProject", workflowId: "root" },
      });
    });
  });

  describe("importToWorkflowGroup", () => {
    it("should import files", () => {
      mockedAPI.desktop.importFiles.mockResolvedValue(["file1"]);
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
      mockedAPI.desktop.importWorkflows.mockResolvedValue(["wf1"]);
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

  describe("exportSpaceItem", () => {
    it("should export workflows", () => {
      const { store } = loadStore();
      store.state.spaces.projectPath.project2 = {
        spaceProviderId: "local",
        spaceId: "local",
        itemId: "level2",
      };

      store.dispatch("spaces/exportSpaceItem", {
        projectId: "project2",
        itemId: "level2",
      });
      expect(mockedAPI.desktop.exportSpaceItem).toHaveBeenCalledWith({
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
      const spaceId = "local";
      const spaceProviderId = "local";

      store.state.spaces.projectPath.project2 = {
        spaceProviderId,
        spaceId,
        itemId: "level2",
      };

      await store.dispatch("spaces/deleteItems", {
        projectId: "project2",
        itemIds,
        $router: {},
      });

      expect(mockedAPI.space.deleteItems).toHaveBeenCalledWith({
        spaceId: "local",
        spaceProviderId: "local",
        itemIds,
      });
    });

    it("should force close projects that are open", async () => {
      const itemIds = ["item0", "item1"];

      const space = createSpace({ id: "local" });
      const localProvider = createSpaceProvider({
        spaces: [space],
      });

      const openProjects = [
        createProject({
          projectId: "project1",
          origin: {
            spaceId: space.id,
            providerId: localProvider.id,
            itemId: "item0",
          },
        }),
      ];

      const { store, dispatchSpy } = loadStore({
        openProjects,
        forceCloseProjects: vi.fn(() => "project2"),
      });

      store.state.spaces.projectPath.project2 = {
        spaceProviderId: localProvider.id,
        spaceId: space.id,
        itemId: "level2",
      };

      store.commit("spaces/setSpaceProviders", {
        [localProvider.id]: localProvider,
      });

      const $router = { push: vi.fn() };

      await store.dispatch("spaces/deleteItems", {
        projectId: "project2",
        itemIds,
        $router,
      });

      expect(dispatchSpy).toHaveBeenCalledWith(
        "application/forceCloseProjects",
        { projectIds: ["project1"] },
      );

      expect(mockedAPI.space.deleteItems).toHaveBeenCalledWith({
        spaceId: "local",
        spaceProviderId: "local",
        itemIds,
      });

      expect($router.push).toHaveBeenCalledWith({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId: "project2", workflowId: "root" },
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
        { projectId },
      );
    });
  });

  describe("moveOrCopyItems", () => {
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

      await store.dispatch("spaces/moveOrCopyItems", {
        projectId,
        itemIds,
        destWorkflowGroupItemId,
        collisionStrategy,
      });
      expect(mockedAPI.space.moveOrCopyItems).toHaveBeenCalledWith({
        spaceProviderId: "local",
        spaceId: "local",
        itemIds,
        destWorkflowGroupItemId,
        collisionHandling: collisionStrategy,
      });
      expect(mockedAPI.space.listWorkflowGroup).toHaveBeenCalledWith(
        expect.objectContaining({ itemId: "level2" }),
      );
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
          JSON.stringify(store.state.spaces.projectPath[projectId]),
          // @ts-ignore
          { path: [{ id: "level1" }, { id: "level2" }] },
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
          JSON.stringify(store.state.spaces.projectPath[projectId]),
          // @ts-ignore
          { path: [] },
        );

        expect(
          store.getters["spaces/parentWorkflowGroupId"](projectId),
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
          JSON.stringify(store.state.spaces.projectPath[projectId]),
          // @ts-ignore
          { path: [{ id: "path1" }] },
        );

        expect(store.getters["spaces/parentWorkflowGroupId"](projectId)).toBe(
          "root",
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
          JSON.stringify(store.state.spaces.projectPath[projectId]),
          // @ts-ignore
          { path: [{ id: "path1" }, { id: "path2" }] },
        );

        expect(store.getters["spaces/parentWorkflowGroupId"](projectId)).toBe(
          "path1",
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
          JSON.stringify(store.state.spaces.projectPath[projectId]),
          // @ts-ignore
          { path: [] },
        );

        expect(store.getters["spaces/currentWorkflowGroupId"](projectId)).toBe(
          "root",
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
          JSON.stringify(store.state.spaces.projectPath[projectId]),
          // @ts-ignore
          { path: [{ id: "path1" }] },
        );

        expect(store.getters["spaces/currentWorkflowGroupId"](projectId)).toBe(
          "path1",
        );
      });
    });

    describe("getOpenedWorkflowItems", () => {
      it("should return the opened workflow items", () => {
        const openProjects = [
          { origin: { providerId: "local", spaceId: "local", itemId: "4" } },
          { origin: { providerId: "local", spaceId: "local", itemId: "8" } },
        ];

        const { store } = loadStore({ openProjects });
        const projectId = "project2";
        store.state.spaces.projectPath[projectId] = {
          spaceProviderId: "local",
          spaceId: "local",
          itemId: "level2",
        };

        store.state.spaces.workflowGroupCache.set(
          JSON.stringify(store.state.spaces.projectPath[projectId]),
          // @ts-ignore
          fetchWorkflowGroupContentResponse,
        );

        store.commit("spaces/setSpaceProviders", {
          local: createSpaceProvider(),
        });

        expect(
          store.getters["spaces/getOpenedWorkflowItems"](projectId),
        ).toEqual(["4", "8"]);
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
          JSON.stringify(fetchWorkflowGroupContentResponse),
        );
        activeWorkflowGroup.items.push({
          id: "5",
          name: "Folder 5",
          type: "WorkflowGroup",
        });

        const { store } = loadStore({ openProjects });

        store.commit("spaces/setSpaceProviders", {
          local: createSpaceProvider(),
        });

        const projectId = "project2";
        store.state.spaces.projectPath[projectId] = {
          spaceProviderId: "local",
          spaceId: "local",
          itemId: "level2",
        };
        store.state.spaces.workflowGroupCache.set(
          JSON.stringify(store.state.spaces.projectPath[projectId]),
          activeWorkflowGroup,
        );

        expect(store.getters["spaces/getOpenedFolderItems"](projectId)).toEqual(
          ["2", "5"],
        );
      });
    });

    describe("selectionContainsFile", () => {
      it("return whether a file is selected", () => {
        const { store } = loadStore();
        const projectId = "project2";
        store.state.spaces.projectPath[projectId] = {
          spaceProviderId: "private",
          spaceId: "local",
          itemId: "level2",
        };
        store.state.spaces.spaceProviders = {
          private: {
            // @ts-ignore
            spaces: [{ id: "local" }],
          },
        };

        const activeWorkflowGroup = {
          id: "private",
          path: [],
          items: [
            {
              id: "1",
              name: "Folder 1",
              type: "Data",
            },
            {
              id: "2",
              name: "Folder 2",
              type: "Workflow",
            },
          ],
        };

        store.state.spaces.workflowGroupCache.set(
          JSON.stringify(store.state.spaces.projectPath[projectId]),
          // @ts-ignore
          activeWorkflowGroup,
        );

        expect(
          store.getters["spaces/selectionContainsFile"](projectId, ["2"]),
        ).toBeFalsy();
        expect(
          store.getters["spaces/selectionContainsFile"](projectId, ["1"]),
        ).toBeTruthy();
      });
    });
  });
});
