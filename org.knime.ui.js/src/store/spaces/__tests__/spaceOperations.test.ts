/* eslint-disable max-lines */
import { afterEach, describe, expect, it, vi } from "vitest";
import { API } from "@api";

import { isBrowser, isDesktop } from "@/environment";
import { $bus } from "@/plugins/event-bus";
import { APP_ROUTES } from "@/router/appRoutes";
import {
  createProject,
  createSpace,
  createSpaceGroup,
  createSpaceProvider,
} from "@/test/factories";
import { deepMocked } from "@/test/utils";
import { mockEnvironment } from "@/test/utils/mockEnvironment";

import { fetchWorkflowGroupContentResponse, loadStore } from "./loadStore";

const busEmitSpy = vi.spyOn($bus, "emit");
const mockedAPI = deepMocked(API);

// TODO NXT-3468 when Desktop and Browser are in sync, this environment mock won't be necessary any more
vi.mock("@/environment");

const { usePromptCollisionStrategiesMock } = vi.hoisted(() => ({
  usePromptCollisionStrategiesMock: vi.fn(),
}));

vi.mock("@/composables/useConfirmDialog/usePromptCollisionHandling", () => ({
  usePromptCollisionStrategies: usePromptCollisionStrategiesMock,
}));

describe("spaces::spaceOperations", () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockEnvironment("DESKTOP", { isDesktop, isBrowser });
  });

  describe("fetchWorkflowGroupContent", () => {
    it("should fetch items correctly and set the spaceId and spaceProviderId if not set", async () => {
      const { spaceOperationsStore, spaceCachingStore } = loadStore();

      await spaceOperationsStore.fetchWorkflowGroupContent({
        projectId: "myProject1",
      });
      expect(mockedAPI.space.listWorkflowGroup).toHaveBeenCalledWith({
        spaceProviderId: "mockProviderId",
        spaceId: "mockSpaceId",
        itemId: "bar",
      });

      expect(
        spaceCachingStore.workflowGroupCache.get(
          JSON.stringify(spaceCachingStore.projectPath.myProject1),
        ),
      ).toEqual(fetchWorkflowGroupContentResponse);
    });

    it("should retry fetch once", async () => {
      const { spaceOperationsStore, spaceProvidersStore, spaceCachingStore } =
        loadStore();

      spaceProvidersStore.spaceProviders = {
        // @ts-expect-error
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
      mockedAPI.space.getSpaceGroups.mockResolvedValueOnce([{}]);
      mockedAPI.space.listWorkflowGroup.mockRejectedValueOnce(
        new Error("Error fetching content"),
      );

      await spaceOperationsStore.fetchWorkflowGroupContent({
        projectId: "myProject1",
      });
      expect(mockedAPI.space.listWorkflowGroup).toHaveBeenCalledWith({
        spaceProviderId: "mockProviderId",
        spaceId: "mockSpaceId",
        itemId: "bar",
      });

      expect(
        spaceCachingStore.workflowGroupCache.get(
          JSON.stringify(spaceCachingStore.projectPath.myProject1),
        ),
      ).toEqual(fetchWorkflowGroupContentResponse);
    });

    it("should throw if it fails more than once", async () => {
      const { spaceOperationsStore, spaceProvidersStore } = loadStore();

      // mute consola
      // @ts-expect-error
      consola.error = () => {};

      spaceProvidersStore.spaceProviders = {
        // @ts-expect-error
        hub1: {},
      };

      const mockSpaceProvider = createSpaceProvider({
        id: "hub1",
        connected: true,
        user: { name: "John Doe" },
      });
      mockedAPI.space.getSpaceGroups.mockResolvedValueOnce([{}]);
      mockedAPI.desktop.connectSpaceProvider.mockResolvedValueOnce(
        mockSpaceProvider,
      );

      mockedAPI.space.listWorkflowGroup
        .mockRejectedValueOnce(new Error("error message"))
        .mockRejectedValueOnce(new Error("error message"));

      await expect(() =>
        spaceOperationsStore.fetchWorkflowGroupContent({
          projectId: "myProject1",
        }),
      ).rejects.toThrow("Error trying to fetch workflow group content");
    });

    it("should forward errors when trying to connect `NetworkException`s", async () => {
      const { spaceOperationsStore, spaceProvidersStore } = loadStore();

      spaceProvidersStore.spaceProviders = {
        // @ts-expect-error
        hub1: {},
      };

      // null will indicate a failure when connecting to this provider
      mockedAPI.desktop.connectSpaceProvider.mockResolvedValue(null);

      const error = new Error("Failed to connect to remote");

      // fail once so that it gets retried which will attempt to connect
      mockedAPI.space.listWorkflowGroup.mockRejectedValue(error);

      await expect(() =>
        spaceOperationsStore.fetchWorkflowGroupContent({
          projectId: "myProject1",
        }),
      ).rejects.toThrowError(error);
    });
  });

  describe("changeDirectory", () => {
    it("should change to another directory", () => {
      const { spaceOperationsStore, spaceCachingStore } = loadStore();

      spaceOperationsStore.changeDirectory({
        projectId: "myProject1",
        pathId: "baz",
      });

      // changed project path itemId
      expect(spaceCachingStore.projectPath.myProject1.itemId).toBe("baz");
    });

    it("should change to a parent directory", () => {
      const { spaceOperationsStore, spaceCachingStore } = loadStore();

      spaceCachingStore.workflowGroupCache.set(
        JSON.stringify(spaceCachingStore.projectPath.myProject1),
        // @ts-expect-error
        { path: [{ id: "level1" }, { id: "level2" }] },
      );

      spaceOperationsStore.changeDirectory({
        projectId: "myProject1",
        pathId: "..",
      });

      expect(spaceCachingStore.projectPath.myProject1.itemId).toBe("level1");
    });
  });

  describe("createWorkflow", () => {
    it("should create a new workflow", async () => {
      const { spaceOperationsStore, spaceCachingStore } = loadStore();
      mockedAPI.space.createWorkflow.mockResolvedValue({
        id: "NewFile",
        type: "Workflow",
      });

      spaceCachingStore.projectPath.project2 = {
        spaceProviderId: "local",
        spaceId: "local",
        itemId: "level2",
      };

      const workflowName = "workflow 1";

      await spaceOperationsStore.createWorkflow({
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
    const serviceCallExceptionFromBE = {
      code: -32600,
      data: {
        code: "ServiceCallException",
        title: "error message",
        canCopy: false,
        message: "error message",
      },
    };

    it("should create a new folder", async () => {
      const { spaceOperationsStore, spaceCachingStore } = loadStore();
      mockedAPI.space.createWorkflowGroup.mockResolvedValue({
        id: "NewFolder",
        type: "WorkflowGroup",
      });

      spaceCachingStore.projectPath.project2 = {
        spaceProviderId: "local",
        spaceId: "local",
        itemId: "level2",
      };

      await spaceOperationsStore.createFolder({ projectId: "project2" });
      expect(spaceOperationsStore.activeRenamedItemId).toBe("NewFolder");
      expect(mockedAPI.space.createWorkflowGroup).toHaveBeenCalledWith(
        expect.objectContaining({ spaceId: "local", itemId: "level2" }),
      );
      expect(mockedAPI.space.listWorkflowGroup).toHaveBeenCalledWith(
        expect.objectContaining({ itemId: "level2" }),
      );
    });

    it("should throw StoreActionException if folder fails to create", async () => {
      const { spaceOperationsStore, spaceCachingStore } = loadStore();

      mockedAPI.space.getSpaceGroups.mockResolvedValueOnce([{}]);
      mockedAPI.space.createWorkflowGroup.mockRejectedValueOnce(
        serviceCallExceptionFromBE,
      );

      spaceCachingStore.projectPath.project2 = {
        spaceProviderId: "local",
        spaceId: "local",
        itemId: "level2",
      };

      await expect(() =>
        spaceOperationsStore.createFolder({ projectId: "project2" }),
      ).rejects.toThrow(
        Error("Error while creating folder", {
          cause: serviceCallExceptionFromBE,
        }),
      );
    });

    it("should throw StoreActionException if content refresh fails after folder is created", async () => {
      mockedAPI.desktop.connectSpaceProvider.mockResolvedValue(
        createSpaceProvider({ connected: true }),
      );
      const { spaceOperationsStore, spaceCachingStore } = loadStore();

      mockedAPI.space.createWorkflowGroup.mockResolvedValue({
        id: "NewFolder",
        type: "WorkflowGroup",
      });

      mockedAPI.space.listWorkflowGroup.mockRejectedValue(
        serviceCallExceptionFromBE,
      );

      spaceCachingStore.projectPath.project2 = {
        spaceProviderId: "local",
        spaceId: "local",
        itemId: "level2",
      };

      await expect(() =>
        spaceOperationsStore.createFolder({ projectId: "project2" }),
      ).rejects.toThrow(
        Error("Error trying to fetch workflow group content", {
          cause: serviceCallExceptionFromBE,
        }),
      );
    });
  });

  describe("openProject", () => {
    it("should open workflow", async () => {
      const { spaceOperationsStore, spaceCachingStore } = loadStore();

      spaceCachingStore.projectPath.project2 = {
        spaceProviderId: "local",
        spaceId: "local",
        itemId: "level2",
      };

      await spaceOperationsStore.openProject({
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
      const { spaceOperationsStore, spaceCachingStore } = loadStore();

      spaceCachingStore.projectPath.project2 = {
        spaceProviderId: "local",
        spaceId: "local",
        itemId: "something",
      };

      mockedAPI.desktop.openProject.mockRejectedValue(
        "Could not open workflow",
      );

      await expect(() =>
        spaceOperationsStore.openProject({
          providerId: "local",
          spaceId: "local",
          itemId: "foobar",
        }),
      ).rejects.toThrow("Could not open workflow");
    });

    it("should navigate to already open workflow", async () => {
      const openProjects = [
        createProject({
          projectId: "dummyProject",
          origin: { providerId: "local", spaceId: "local", itemId: "dummy" },
        }),
      ];
      const { spaceOperationsStore, spaceCachingStore, spaceProvidersStore } =
        loadStore({ openProjects });

      spaceCachingStore.projectPath.project2 = {
        spaceProviderId: "local",
        spaceId: "local",
        itemId: "folder1",
      };

      spaceProvidersStore.setSpaceProviders({
        local: createSpaceProvider(),
      });

      const mockRouter = { push: vi.fn() };

      await spaceOperationsStore.openProject({
        providerId: "local",
        spaceId: "local",
        itemId: "dummy",
        // @ts-expect-error
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
    it("should import files", async () => {
      mockedAPI.desktop.importFiles.mockResolvedValue(["file1"]);
      const { spaceOperationsStore, spaceCachingStore } = loadStore();

      spaceCachingStore.projectPath.project2 = {
        spaceProviderId: "local",
        spaceId: "local",
        itemId: "level1",
      };

      await spaceOperationsStore.importToWorkflowGroup({
        projectId: "project2",
        importType: "FILES",
      });

      expect(mockedAPI.desktop.importFiles).toHaveBeenCalledWith({
        itemId: "level1",
        spaceId: "local",
        spaceProviderId: "local",
      });
    });

    it("should import workflows", async () => {
      mockedAPI.desktop.importWorkflows.mockResolvedValue(["wf1"]);
      const { spaceOperationsStore, spaceCachingStore } = loadStore();
      spaceCachingStore.projectPath.project2 = {
        spaceProviderId: "local",
        spaceId: "local",
        itemId: "level2",
      };

      await spaceOperationsStore.importToWorkflowGroup({
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
    it("should export workflows", async () => {
      const { spaceOperationsStore, spaceCachingStore } = loadStore();
      spaceCachingStore.projectPath.project2 = {
        spaceProviderId: "local",
        spaceId: "local",
        itemId: "level2",
      };

      await spaceOperationsStore.exportSpaceItem({
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
    const itemIds = ["item0", "item1"];
    const spaceId = "local";
    const spaceProviderId = "local";

    it("should delete items", async () => {
      const { spaceOperationsStore, spaceCachingStore, spaceProvidersStore } =
        loadStore();
      spaceCachingStore.projectPath.project2 = {
        spaceProviderId,
        spaceId,
        itemId: "level2",
      };
      spaceProvidersStore.setSpaceProviders({
        [spaceProviderId]: createSpaceProvider(),
      });

      await spaceOperationsStore.deleteItems({
        projectId: "project2",
        itemIds,
        // @ts-expect-error
        $router: {},
      });

      expect(mockedAPI.space.deleteItems).toHaveBeenCalledWith({
        spaceId,
        spaceProviderId,
        itemIds,
        softDelete: false,
      });
    });

    it("should force close projects that are open", async () => {
      const space = createSpace({ id: "local" });
      const localProvider = createSpaceProvider({
        spaceGroups: [
          createSpaceGroup({
            spaces: [space],
          }),
        ],
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

      const {
        spaceOperationsStore,
        spaceCachingStore,
        spaceProvidersStore,
        desktopInteractionsStore,
      } = loadStore({
        openProjects,
        forceCloseProjects: vi.fn(() => "project2"),
      });

      spaceCachingStore.projectPath.project2 = {
        spaceProviderId: localProvider.id,
        spaceId: space.id,
        itemId: "level2",
      };

      spaceProvidersStore.setSpaceProviders({
        [localProvider.id]: localProvider,
      });

      const $router = { push: vi.fn() };

      await spaceOperationsStore.deleteItems({
        projectId: "project2",
        itemIds,
        // @ts-expect-error
        $router,
      });

      expect(desktopInteractionsStore.forceCloseProjects).toHaveBeenCalledWith({
        projectIds: ["project1"],
      });

      expect(mockedAPI.space.deleteItems).toHaveBeenCalledWith({
        spaceId,
        spaceProviderId,
        itemIds,
        softDelete: false,
      });

      expect($router.push).toHaveBeenCalledWith({
        name: APP_ROUTES.WorkflowPage,
        params: { projectId: "project2", workflowId: "root" },
      });
    });

    it("should re-fetch workflow group content", async () => {
      const projectId = "project2";

      const { spaceOperationsStore, spaceCachingStore, spaceProvidersStore } =
        loadStore();
      spaceCachingStore.projectPath.project2 = {
        spaceProviderId,
        spaceId,
        itemId: "level2",
      };
      spaceProvidersStore.setSpaceProviders({
        local: createSpaceProvider(),
      });

      await spaceOperationsStore.deleteItems(
        // @ts-expect-error
        { projectId, itemIds },
      );
      expect(
        spaceOperationsStore.fetchWorkflowGroupContent,
      ).toHaveBeenCalledWith({ projectId });
    });

    it("should call backend with softDelete = true if AP runs in browser", async () => {
      mockEnvironment("BROWSER", { isBrowser, isDesktop });
      const { spaceOperationsStore, spaceCachingStore, spaceProvidersStore } =
        loadStore();

      spaceCachingStore.projectPath.project2 = {
        spaceProviderId,
        spaceId,
        itemId: "",
      };
      spaceProvidersStore.setSpaceProviders({
        [spaceProviderId]: createSpaceProvider(),
      });

      await spaceOperationsStore.deleteItems({
        projectId: "project2",
        itemIds,
        // @ts-expect-error
        $router: {},
      });

      expect(mockedAPI.space.deleteItems).toHaveBeenCalledWith({
        spaceId,
        spaceProviderId,
        itemIds,
        softDelete: true,
      });
    });
  });

  describe("checkForCollisionAndMove", () => {
    const setUp = () => {
      const { spaceOperationsStore } = loadStore();
      const { checkForCollisionsAndMove } = spaceOperationsStore;
      const promptCollisionStrategiesMock = vi.fn();
      usePromptCollisionStrategiesMock.mockReturnValue({
        promptCollisionStrategies: promptCollisionStrategiesMock,
      });
      return { promptCollisionStrategiesMock, checkForCollisionsAndMove };
    };

    const params = {
      spaceId: "space-id",
      spaceProviderId: "space-provider-id",
      itemIds: ["item-1", "item-2"],
      destSpaceId: "dest-space-id",
      destWorkflowGroupItemId: "dest-item-id",
      copy: false,
    };

    const paramsWithCollisionHandling = {
      ...params,
      collisionHandling: "AUTORENAME",
    } as const;

    const collisionExceptionFromBE = {
      code: -32600,
      data: {
        code: "CollisionException",
        title: "error message",
        canCopy: false,
        message: "error message",
      },
    };

    it("uses provided params", async () => {
      const { promptCollisionStrategiesMock, checkForCollisionsAndMove } =
        setUp();
      await checkForCollisionsAndMove(
        structuredClone(paramsWithCollisionHandling),
      );
      expect(mockedAPI.space.moveOrCopyItems).toHaveBeenCalledWith(
        paramsWithCollisionHandling,
      );
      expect(promptCollisionStrategiesMock).not.toHaveBeenCalled();
    });

    it("will not retry if collision strategy is provided and instead re-throw error", async () => {
      const { promptCollisionStrategiesMock, checkForCollisionsAndMove } =
        setUp();
      mockedAPI.space.moveOrCopyItems.mockRejectedValueOnce(
        collisionExceptionFromBE,
      );
      await expect(() =>
        checkForCollisionsAndMove(structuredClone(paramsWithCollisionHandling)),
      ).rejects.toThrowError();

      expect(promptCollisionStrategiesMock).not.toHaveBeenCalled();
      expect(mockedAPI.space.moveOrCopyItems).toHaveBeenCalledOnce();
    });

    it("will retry with selected collision strategy in case of collision error", async () => {
      const { promptCollisionStrategiesMock, checkForCollisionsAndMove } =
        setUp();
      promptCollisionStrategiesMock.mockResolvedValue("OVERWRITE");
      mockedAPI.space.moveOrCopyItems.mockRejectedValueOnce(
        collisionExceptionFromBE,
      );

      await checkForCollisionsAndMove(params);

      expect(promptCollisionStrategiesMock).toHaveBeenCalled();
      expect(mockedAPI.space.moveOrCopyItems).toHaveBeenCalledTimes(2);
      expect(mockedAPI.space.moveOrCopyItems).toHaveBeenNthCalledWith(
        1,
        params,
      );
      expect(mockedAPI.space.moveOrCopyItems).toHaveBeenNthCalledWith(2, {
        ...params,
        collisionHandling: "OVERWRITE",
      });
    });

    it("will not retry if user cancels", async () => {
      const { promptCollisionStrategiesMock, checkForCollisionsAndMove } =
        setUp();
      promptCollisionStrategiesMock.mockResolvedValue("CANCEL");
      mockedAPI.space.moveOrCopyItems.mockRejectedValueOnce(
        collisionExceptionFromBE,
      );

      await checkForCollisionsAndMove(params);

      expect(promptCollisionStrategiesMock).toHaveBeenCalled();
      expect(mockedAPI.space.moveOrCopyItems).toHaveBeenCalledOnce();
    });

    it("will re-trow error if it is not a CollisionException", async () => {
      const { promptCollisionStrategiesMock, checkForCollisionsAndMove } =
        setUp();
      const IOExceptionFromBE = {
        code: -32600,
        data: {
          code: "IOException",
          title: "error message",
          canCopy: false,
          message: "error message",
        },
      };

      mockedAPI.space.moveOrCopyItems.mockRejectedValueOnce(IOExceptionFromBE);
      await expect(() =>
        checkForCollisionsAndMove(structuredClone(params)),
      ).rejects.toThrowError();

      expect(mockedAPI.space.moveOrCopyItems).toHaveBeenCalledOnce();
      expect(promptCollisionStrategiesMock).not.toHaveBeenCalled();
    });
  });

  describe("moveOrCopyItems", () => {
    it("should move items", async () => {
      const itemIds = ["id1", "id2"];
      const destWorkflowGroupItemId = "group1";
      const collisionHandling = "OVERWRITE";

      const { spaceOperationsStore, spaceCachingStore } = loadStore();

      const projectId = "project2";
      spaceCachingStore.projectPath[projectId] = {
        spaceProviderId: "local",
        spaceId: "local",
        itemId: "level2",
      };

      await spaceOperationsStore.moveOrCopyItems({
        projectId,
        itemIds,
        destWorkflowGroupItemId,
        collisionHandling,
        isCopy: false,
      });
      const args = {
        spaceProviderId: "local",
        spaceId: "local",
        destSpaceId: "local",
        itemIds,
        destWorkflowGroupItemId,
        collisionHandling,
        copy: false,
      };
      expect(
        spaceOperationsStore.checkForCollisionsAndMove,
      ).toHaveBeenCalledWith(args);
      expect(mockedAPI.space.moveOrCopyItems).toHaveBeenCalledWith(args);
      expect(mockedAPI.space.listWorkflowGroup).toHaveBeenCalledWith(
        expect.objectContaining({ itemId: "level2" }),
      );
    });
  });

  describe("getters", () => {
    describe("pathToItemId", () => {
      it("should return path as itemId", () => {
        const { spaceOperationsStore } = loadStore();
        const projectId = "something";

        const result = spaceOperationsStore.pathToItemId(projectId, "baz");
        expect(result).toBe("baz");
      });

      it("should change to a parent directory", () => {
        const { spaceOperationsStore, spaceCachingStore } = loadStore();

        const projectId = "project2";
        spaceCachingStore.projectPath[projectId] = {
          spaceProviderId: "local",
          spaceId: "local",
          itemId: "level2",
        };
        spaceCachingStore.workflowGroupCache.set(
          JSON.stringify(spaceCachingStore.projectPath[projectId]),
          // @ts-expect-error
          { path: [{ id: "level1" }, { id: "level2" }] },
        );

        const result = spaceOperationsStore.pathToItemId(projectId, "..");
        expect(result).toBe("level1");
      });
    });

    describe("parentWorkflowGroupId", () => {
      it("should return the correct parent id for a root path", () => {
        const { spaceOperationsStore, spaceCachingStore } = loadStore();
        const projectId = "project2";
        spaceCachingStore.projectPath[projectId] = {
          spaceProviderId: "local",
          spaceId: "local",
          itemId: "level2",
        };
        spaceCachingStore.workflowGroupCache.set(
          JSON.stringify(spaceCachingStore.projectPath[projectId]),
          // @ts-expect-error
          { path: [] },
        );

        expect(
          spaceOperationsStore.parentWorkflowGroupId(projectId),
        ).toBeNull();
      });

      it("should return the correct parent id for a path 1 level below root", () => {
        const { spaceOperationsStore, spaceCachingStore } = loadStore();
        const projectId = "project2";
        spaceCachingStore.projectPath[projectId] = {
          spaceProviderId: "local",
          spaceId: "local",
          itemId: "level2",
        };
        spaceCachingStore.workflowGroupCache.set(
          JSON.stringify(spaceCachingStore.projectPath[projectId]),
          // @ts-expect-error
          { path: [{ id: "path1" }] },
        );

        expect(spaceOperationsStore.parentWorkflowGroupId(projectId)).toBe(
          "root",
        );
      });

      it("should return the correct parent id for a nested level", () => {
        const { spaceOperationsStore, spaceCachingStore } = loadStore();
        const projectId = "project2";
        spaceCachingStore.projectPath[projectId] = {
          spaceProviderId: "local",
          spaceId: "local",
          itemId: "level2",
        };
        spaceCachingStore.workflowGroupCache.set(
          JSON.stringify(spaceCachingStore.projectPath[projectId]),
          // @ts-expect-error
          { path: [{ id: "path1" }, { id: "path2" }] },
        );

        expect(spaceOperationsStore.parentWorkflowGroupId(projectId)).toBe(
          "path1",
        );
      });
    });

    describe("currentWorkflowGroupId", () => {
      it("should return the correct id for a root path", () => {
        const { spaceOperationsStore, spaceCachingStore } = loadStore();
        const projectId = "project2";
        spaceCachingStore.projectPath[projectId] = {
          spaceProviderId: "local",
          spaceId: "local",
          itemId: "level2",
        };
        spaceCachingStore.workflowGroupCache.set(
          JSON.stringify(spaceCachingStore.projectPath[projectId]),
          // @ts-expect-error
          { path: [] },
        );

        expect(spaceOperationsStore.currentWorkflowGroupId(projectId)).toBe(
          "root",
        );
      });

      it("should return the correct id a child path", () => {
        const { spaceOperationsStore, spaceCachingStore } = loadStore();
        const projectId = "project2";
        spaceCachingStore.projectPath[projectId] = {
          spaceProviderId: "local",
          spaceId: "local",
          itemId: "level2",
        };
        spaceCachingStore.workflowGroupCache.set(
          JSON.stringify(spaceCachingStore.projectPath[projectId]),
          // @ts-expect-error
          { path: [{ id: "path1" }] },
        );

        expect(spaceOperationsStore.currentWorkflowGroupId(projectId)).toBe(
          "path1",
        );
      });
    });

    describe("getOpenedWorkflowItems", () => {
      it("should return the opened workflow items", () => {
        const openProjects = [
          createProject({
            origin: { providerId: "local", spaceId: "local", itemId: "4" },
          }),
          createProject({
            origin: { providerId: "local", spaceId: "local", itemId: "8" },
          }),
        ];

        const { spaceOperationsStore, spaceCachingStore, spaceProvidersStore } =
          loadStore({ openProjects });
        const projectId = "project2";
        spaceCachingStore.projectPath[projectId] = {
          spaceProviderId: "local",
          spaceId: "local",
          itemId: "level2",
        };

        spaceCachingStore.workflowGroupCache.set(
          JSON.stringify(spaceCachingStore.projectPath[projectId]),
          // @ts-expect-error
          fetchWorkflowGroupContentResponse,
        );

        spaceProvidersStore.setSpaceProviders({
          local: createSpaceProvider(),
        });

        expect(spaceOperationsStore.getOpenedWorkflowItems(projectId)).toEqual([
          "4",
          "8",
        ]);
      });
    });

    describe("getOpenedFolderItems", () => {
      it("should return the opened folder items", () => {
        const openProjects = [
          createProject({
            origin: {
              providerId: "local",
              spaceId: "local",
              itemId: "workflowItem0",
              ancestorItemIds: ["2", "innerFolderId"],
            },
          }),
          createProject({
            origin: {
              providerId: "local",
              spaceId: "local",
              itemId: "workflowItem2",
              ancestorItemIds: ["5"],
            },
          }),
        ];

        const activeWorkflowGroup = JSON.parse(
          JSON.stringify(fetchWorkflowGroupContentResponse),
        );
        activeWorkflowGroup.items.push({
          id: "5",
          name: "Folder 5",
          type: "WorkflowGroup",
        });

        const { spaceOperationsStore, spaceProvidersStore, spaceCachingStore } =
          loadStore({ openProjects });

        spaceProvidersStore.setSpaceProviders({
          local: createSpaceProvider(),
        });

        const projectId = "project2";
        spaceCachingStore.projectPath[projectId] = {
          spaceProviderId: "local",
          spaceId: "local",
          itemId: "level2",
        };
        spaceCachingStore.workflowGroupCache.set(
          JSON.stringify(spaceCachingStore.projectPath[projectId]),
          activeWorkflowGroup,
        );

        expect(spaceOperationsStore.getOpenedFolderItems(projectId)).toEqual([
          "2",
          "5",
        ]);
      });
    });

    describe("selectionContainsFile", () => {
      it("return whether a file is selected", () => {
        const { spaceOperationsStore, spaceCachingStore, spaceProvidersStore } =
          loadStore();
        const projectId = "project2";
        spaceCachingStore.projectPath[projectId] = {
          spaceProviderId: "private",
          spaceId: "local",
          itemId: "level2",
        };
        spaceProvidersStore.spaceProviders = {
          private: {
            // @ts-expect-error
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

        spaceCachingStore.workflowGroupCache.set(
          JSON.stringify(spaceCachingStore.projectPath[projectId]),
          // @ts-expect-error
          activeWorkflowGroup,
        );

        expect(
          spaceOperationsStore.selectionContainsFile(projectId, ["2"]),
        ).toBeFalsy();
        expect(
          spaceOperationsStore.selectionContainsFile(projectId, ["1"]),
        ).toBeTruthy();
      });
    });
  });
});
