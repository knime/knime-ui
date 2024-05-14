/* eslint-disable max-lines */
import { expect, describe, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { nextTick, type ExtractPropTypes } from "vue";
import { useRoute } from "vue-router";

import { deepMocked, mockVuexStore } from "@/test/utils";
import * as spacesStore from "@/store/spaces";

import Breadcrumb from "webapps-common/ui/components/Breadcrumb.vue";
import Modal from "webapps-common/ui/components/Modal.vue";
import NodePreview from "webapps-common/ui/components/node/NodePreview.vue";
import FileExplorer from "webapps-common/ui/components/FileExplorer/FileExplorer.vue";
import type { FileExplorerItem } from "webapps-common/ui/components/FileExplorer/types";

import { API } from "@api";
import { APP_ROUTES } from "@/router/appRoutes";

import SpaceExplorer from "../SpaceExplorer.vue";
import { SpaceItem } from "@/api/gateway-api/generated-api";

const mockedAPI = deepMocked(API);

const createMockItem = (
  data: Partial<FileExplorerItem> = {},
  itemType: SpaceItem.TypeEnum,
): FileExplorerItem => {
  return {
    id: "dummy",
    name: "dummy",
    canBeRenamed: true,
    canBeDeleted: true,
    isDirectory: false,
    isOpenableFile: true,
    isOpen: false,
    meta: {
      type: itemType,
    },
    ...data,
  };
};

const createMockWorkflow = (
  data: Partial<FileExplorerItem> = {},
): FileExplorerItem => createMockItem(data, SpaceItem.TypeEnum.Workflow);

const createMockComponent = (
  data: Partial<FileExplorerItem> = {},
): FileExplorerItem => createMockItem(data, SpaceItem.TypeEnum.Component);

const fetchWorkflowGroupContentResponse = {
  id: "root",
  path: [],
  items: [
    {
      id: "1",
      name: "Folder 1",
      type: SpaceItem.TypeEnum.WorkflowGroup,
    },
    {
      id: "2",
      name: "Folder 2",
      type: SpaceItem.TypeEnum.WorkflowGroup,
    },
    {
      id: "4",
      name: "File 2",
      type: SpaceItem.TypeEnum.Workflow,
    },
  ],
};

vi.mock("webapps-common/ui/services/toast");
vi.mock("vue-router", () => ({
  useRouter: vi.fn(() => ({ push: () => {} })),
  useRoute: vi.fn(() => ({ name: APP_ROUTES.WorkflowPage })),
}));

describe("SpaceExplorer.vue", () => {
  const doMount = ({
    props = { projectId: null } as ExtractPropTypes<typeof SpaceExplorer>,
    mockResponse = fetchWorkflowGroupContentResponse,
    mockGetSpaceItems = null,
    openProjects = [],
    fileExtensionToNodeTemplateId = {},
    isWriteableMock = vi.fn().mockReturnValue(true),
  } = {}) => {
    // add selected item ids is not supplied as its required now
    if (!props.selectedItemIds) {
      props.selectedItemIds = [];
    }
    if (mockGetSpaceItems) {
      mockedAPI.space.listWorkflowGroup.mockImplementation(mockGetSpaceItems);
    } else {
      mockedAPI.space.listWorkflowGroup.mockResolvedValue(mockResponse);
    }

    mockedAPI.space.createWorkflow.mockResolvedValue({ type: "Workflow" });

    const store = mockVuexStore({
      spaces: spacesStore,
      application: {
        state: {
          openProjects,
          fileExtensionToNodeTemplateId,
        },
        actions: {
          updateGlobalLoader: vi.fn(),
          forceCloseProjects: vi.fn(),
        },
      },
      workflow: {
        actions: {
          addNode: () => {},
        },
        getters: {
          isWritable: isWriteableMock,
        },
      },
      canvas: {
        getters: {
          screenToCanvasCoordinates: vi.fn().mockReturnValue(() => [5, 5]),
        },
        state: {
          getScrollContainerElement: vi
            .fn()
            .mockReturnValue({ contains: vi.fn().mockReturnValue(true) }),
        },
      },
      nodeTemplates: {
        actions: {
          getSingleNodeTemplate: vi.fn().mockReturnValue({
            id: "test.id",
            name: "test.test",
            type: "type",
            inPorts: [],
            outPorts: [],
            icon: "data:image/icon",
          }),
        },
      },
    });

    // default state of default project
    store.state.spaces.projectPath = {
      someProjectId: {
        spaceId: "local",
        spaceProviderId: "local",
        itemId: "root",
      },
    };

    store.state.spaces.spaceProviders = {
      space: {
        spaceId: "space",
        spaceProviderId: "provider",
        itemId: "root",
      },
      local: {
        spaceId: "local",
        spaceProviderId: "provider",
        itemId: "root",
        type: "LOCAL",
      },
    };

    const dispatchSpy = vi.spyOn(store, "dispatch");
    const commitSpy = vi.spyOn(store, "commit");

    const $shortcuts = {
      get: vi.fn().mockImplementation((name) => ({
        text: name,
        hotkeyText: "hotkeyText",
      })),
    };

    const wrapper = mount(SpaceExplorer, {
      props,
      global: {
        plugins: [store],
        stubs: { NuxtLink: true, FocusTrap: true, NodePreview: true },
        mocks: {
          $shortcuts,
          $shapes: { nodeSize: 32 },
        },
      },
    });

    return { wrapper, store, dispatchSpy, commitSpy };
  };

  const doMountAndLoad = async ({
    props = {
      projectId: "someProjectId",
      mode: "normal",
    },
    mockResponse = fetchWorkflowGroupContentResponse,
    mockGetSpaceItems = null,
    openProjects = [],
    fileExtensionToNodeTemplateId = {},
    isWriteableMock = vi.fn().mockReturnValue(true),
  } = {}) => {
    const mountResult = doMount({
      props,
      mockResponse,
      mockGetSpaceItems,
      openProjects,
      fileExtensionToNodeTemplateId,
      isWriteableMock,
    });

    await new Promise((r) => setTimeout(r, 0));

    return mountResult;
  };

  it("should load root directory data on created", async () => {
    const { wrapper } = await doMountAndLoad();

    expect(wrapper.findComponent(FileExplorer).exists()).toBe(true);
    expect(wrapper.findComponent(FileExplorer).props("items")).toEqual(
      fetchWorkflowGroupContentResponse.items.map((item) => ({
        ...item,
        isOpen: false,
        isDirectory: item.type === SpaceItem.TypeEnum.WorkflowGroup,
        isOpenableFile: item.type === SpaceItem.TypeEnum.Workflow,
        canBeDeleted: true,
        canBeRenamed: true,
        meta: {
          type: item.type,
        },
      })),
    );
    expect(wrapper.findComponent(FileExplorer).props("isRootFolder")).toBe(
      true,
    );
  });

  it("should load data on projectId change", async () => {
    const { wrapper, store } = await doMountAndLoad();

    // initial fetch of root has happened
    mockedAPI.space.listWorkflowGroup.mockReset();

    store.commit("spaces/setProjectPath", {
      projectId: "anotherProject",
      value: {
        spaceProviderId: "provider",
        spaceId: "space",
        itemId: "startItemId",
      },
    });

    await wrapper.setProps({
      projectId: "anotherProject",
    });

    expect(mockedAPI.space.listWorkflowGroup).toHaveBeenCalledWith({
      spaceProviderId: "provider",
      spaceId: "space",
      itemId: "startItemId",
    });
  });

  describe("navigate", () => {
    it("should load data when navigating to a directory", async () => {
      const { wrapper } = await doMountAndLoad();

      mockedAPI.space.listWorkflowGroup.mockReset();

      wrapper.findComponent(FileExplorer).vm.$emit("changeDirectory", "1234");
      expect(mockedAPI.space.listWorkflowGroup).toHaveBeenCalledWith({
        spaceProviderId: "local",
        spaceId: "local",
        itemId: "1234",
      });

      await new Promise((r) => setTimeout(r, 0));
      expect(wrapper.emitted("itemChanged")[0][0]).toBe("1234");
    });

    it("should navigate via the breadcrumb", async () => {
      const { wrapper } = await doMountAndLoad({
        mockResponse: {
          ...fetchWorkflowGroupContentResponse,
          path: [
            { id: "parentId", name: "Parent Directory" },
            { id: "currentDirectoryId", name: "Current Directory" },
          ],
        },
      });

      wrapper
        .findComponent(Breadcrumb)
        .vm.$emit("click-item", { id: "parentId" });
      expect(mockedAPI.space.listWorkflowGroup).toHaveBeenCalledWith({
        spaceProviderId: "local",
        spaceId: "local",
        itemId: "parentId",
      });
      await flushPromises();
      expect(wrapper.emitted("itemChanged")[0][0]).toBe("parentId");
    });

    it("should load data when navigating back to the parent directory", async () => {
      const { wrapper, store } = doMount({
        mockResponse: {
          ...fetchWorkflowGroupContentResponse,
          path: [
            { id: "parentId", name: "Parent Directory" },
            { id: "currentDirectoryId", name: "Current Directory" },
          ],
        },
      });

      // make sure the content is loaded and cached by the correct projectId (we load on mount and on projectId change)
      store.state.spaces.projectPath = {
        differentProjectId: {
          spaceProviderId: "someProviderId",
          spaceId: "someSpace",
          itemId: "currentDirectoryId",
        },
      };

      await wrapper.setProps({ projectId: "differentProjectId" });
      await new Promise((r) => setTimeout(r, 0));

      mockedAPI.space.listWorkflowGroup.mockReset();
      wrapper.findComponent(FileExplorer).vm.$emit("changeDirectory", "..");
      expect(mockedAPI.space.listWorkflowGroup).toHaveBeenCalledWith({
        spaceProviderId: "someProviderId",
        spaceId: "someSpace",
        itemId: "parentId",
      });
    });

    it('should navigate to "root" when going back from 1 level below the root directory', async () => {
      const { wrapper } = await doMountAndLoad({
        mockResponse: {
          ...fetchWorkflowGroupContentResponse,
          path: [{ id: "currentDirectoryId", name: "Current Directory" }],
        },
      });

      mockedAPI.space.listWorkflowGroup.mockReset();
      wrapper.findComponent(FileExplorer).vm.$emit("changeDirectory", "..");
      expect(mockedAPI.space.listWorkflowGroup).toHaveBeenCalledWith({
        spaceProviderId: "local",
        spaceId: "local",
        itemId: "root",
      });
    });
  });

  describe("open indicator", () => {
    it("should set the openIndicator for open workflows", async () => {
      const openProjects = [
        {
          origin: {
            providerId: "local",
            spaceId: "local",
            itemId: fetchWorkflowGroupContentResponse.items[2].id,
          },
        },
      ];
      const { wrapper } = await doMountAndLoad({ openProjects });
      expect(wrapper.findComponent(FileExplorer).props("items")[2]).toEqual(
        expect.objectContaining({ isOpen: true }),
      );
    });

    it("should set the openIndicator for folders with open workflows", async () => {
      const openProjects = [
        {
          origin: {
            providerId: "local",
            spaceId: "local",
            itemId: "8",
            ancestorItemIds: ["1", "7"],
          },
        },
      ];
      const { wrapper } = await doMountAndLoad({ openProjects });
      expect(wrapper.findComponent(FileExplorer).props("items")[0]).toEqual(
        expect.objectContaining({ isOpen: true }),
      );
    });
  });

  it("should open a workflow", async () => {
    const { wrapper, dispatchSpy } = await doMountAndLoad();

    wrapper
      .findComponent(FileExplorer)
      .vm.$emit("openFile", createMockWorkflow());

    await nextTick();

    expect(dispatchSpy).toHaveBeenCalledWith("spaces/openProject", {
      projectId: "someProjectId",
      workflowItemId: "dummy",
      $router: expect.anything(),
    });
  });

  it("should open a shared component", async () => {
    const { wrapper, dispatchSpy } = await doMountAndLoad();

    wrapper
      .findComponent(FileExplorer)
      .vm.$emit("openFile", createMockComponent());

    await nextTick();

    expect(dispatchSpy).toHaveBeenCalledWith("spaces/openProject", {
      projectId: "someProjectId",
      workflowItemId: "dummy",
      $router: expect.anything(),
    });
  });

  describe("renaming", () => {
    it("should rename items", async () => {
      const { wrapper, dispatchSpy } = await doMountAndLoad();
      const itemId = "12345";
      const newName = "some name";
      wrapper
        .findComponent(FileExplorer)
        .vm.$emit("renameFile", { itemId, newName });
      expect(dispatchSpy).toHaveBeenCalledWith("spaces/renameItem", {
        projectId: "someProjectId",
        itemId,
        newName,
      });
    });

    it("should not allow renaming open workflows or folders with open workflows", async () => {
      const openProjects = [
        {
          origin: {
            providerId: "local",
            spaceId: "local",
            itemId: "8",
            ancestorItemIds: ["1", "7"],
          },
        },
        {
          origin: {
            providerId: "local",
            spaceId: "local",
            itemId: "4",
          },
        },
      ];
      const { wrapper } = await doMountAndLoad({ openProjects });
      expect(wrapper.findComponent(FileExplorer).props("items")[0]).toEqual(
        expect.objectContaining({ canBeRenamed: false }),
      );
      expect(wrapper.findComponent(FileExplorer).props("items")[1]).toEqual(
        expect.objectContaining({ canBeRenamed: true }),
      );
      expect(wrapper.findComponent(FileExplorer).props("items")[2]).toEqual(
        expect.objectContaining({ canBeRenamed: false }),
      );
    });
  });

  describe("duplicating", () => {
    it("should duplicate selected items", async () => {
      // makes sure we disregard any strategy and always choose "AUTORENAME" when "moving" into "." (i.e. duplicating)
      mockedAPI.desktop.getNameCollisionStrategy.mockReturnValue("NOOP");

      const { wrapper, dispatchSpy } = await doMountAndLoad();

      const sourceItems = ["id1", "id2"];

      // call the handler
      // (we can't trigger easily via the FileExplorer as it needs to
      // have an open context menu which requires a lot of mocks)
      // @ts-expect-error
      wrapper.vm.onDuplicateItems(sourceItems);

      expect(dispatchSpy).toHaveBeenNthCalledWith(3, "spaces/moveOrCopyItems", {
        projectId: "someProjectId",
        itemIds: sourceItems,
        destWorkflowGroupItemId: "root",
        collisionStrategy: "AUTORENAME",
        isCopy: true,
      });
    });
  });

  describe("deleting", () => {
    it("should not allow deleting folders with open workflows", async () => {
      const openProjects = [
        {
          origin: {
            providerId: "local",
            spaceId: "local",
            itemId: "8",
            ancestorItemIds: ["1", "7"],
          },
        },
      ];
      const { wrapper } = await doMountAndLoad({ openProjects });
      expect(wrapper.findComponent(FileExplorer).props("items")[0]).toEqual(
        expect.objectContaining({ canBeDeleted: false }),
      );
      expect(wrapper.findComponent(FileExplorer).props("items")[2]).toEqual(
        expect.objectContaining({ canBeDeleted: true }),
      );
    });

    it("should show delete modal on deleteItems", async () => {
      const items: FileExplorerItem[] = [
        createMockWorkflow({
          id: "item0",
          name: "WORKFLOW_NAME",
        }),
      ];
      const { wrapper } = await doMountAndLoad();

      wrapper.findComponent(FileExplorer).vm.$emit("deleteItems", { items });
      // @ts-ignore
      expect(wrapper.vm.deleteModal.isActive).toBeTruthy();
    });

    it("should trigger closeItems before deleteItems onDeleteItems", async () => {
      const items: FileExplorerItem[] = [
        createMockWorkflow({
          id: "item0",
          name: "WORKFLOW_NAME",
        }),
      ];
      const openProjects = [
        {
          origin: {
            providerId: "local",
            spaceId: "local",
            itemId: "item0",
            ancestorItemIds: ["1", "7"],
          },
          name: "test2",
          projectId: "testPID",
        },
        {
          origin: {
            providerId: "other",
            spaceId: "blub",
            itemId: "item0",
            ancestorItemIds: ["1", "7"],
          },
          name: "test3",
          projectId: "testPID2",
        },
        {
          name: "test4",
          projectId: "testPID3",
        },
      ];
      const { wrapper, dispatchSpy } = await doMountAndLoad({ openProjects });

      wrapper.findComponent(FileExplorer).vm.$emit("deleteItems", { items });
      // @ts-expect-error
      await wrapper.vm.deleteItems();

      expect(dispatchSpy).toHaveBeenNthCalledWith(3, "spaces/deleteItems", {
        itemIds: ["item0"],
        projectId: "someProjectId",
        $router: expect.anything(),
      });

      expect(dispatchSpy).toHaveBeenNthCalledWith(
        4,
        "application/forceCloseProjects",
        { projectIds: [openProjects[0].projectId] },
      );
    });

    it("should not delete item on negative response", async () => {
      const items: FileExplorerItem[] = [
        createMockWorkflow({
          id: "item0",
          name: "WORKFLOW_NAME",
        }),
      ];
      vi.spyOn(window, "confirm").mockImplementation(() => false);
      const { wrapper, dispatchSpy } = await doMountAndLoad();

      wrapper.findComponent(FileExplorer).vm.$emit("deleteItems", { items });
      // @ts-expect-error
      expect(wrapper.vm.deleteModal.isActive).toBeTruthy();
      wrapper.findComponent(Modal).vm.$emit("cancel");
      expect(dispatchSpy).not.toHaveBeenCalledWith("spaces/deleteItems", {
        itemIds: ["item0"],
      });
    });
  });

  describe("move items", () => {
    it("should move items", async () => {
      mockedAPI.desktop.getNameCollisionStrategy.mockReturnValue("OVERWRITE");
      const { wrapper, dispatchSpy } = await doMountAndLoad();
      await new Promise((r) => setTimeout(r, 0));

      const sourceItems = ["id1", "id2"];
      const targetItem = "group1";
      const onComplete = vi.fn();
      wrapper
        .findComponent(FileExplorer)
        .vm.$emit("moveItems", { sourceItems, targetItem, onComplete });
      await nextTick();

      expect(dispatchSpy).toHaveBeenCalledWith("spaces/moveOrCopyItems", {
        projectId: "someProjectId",
        itemIds: sourceItems,
        destWorkflowGroupItemId: targetItem,
        collisionStrategy: "OVERWRITE",
        isCopy: false,
      });
      await flushPromises();

      expect(onComplete).toHaveBeenCalledWith(true);
    });

    it("should move items to root", async () => {
      mockedAPI.desktop.getNameCollisionStrategy.mockReturnValue("OVERWRITE");
      const { wrapper, dispatchSpy } = doMount({
        props: { projectId: "someProjectId" },
        mockResponse: {
          ...fetchWorkflowGroupContentResponse,
          path: [{ id: "currentDirectoryId", name: "Current Directory" }],
        },
      });
      await new Promise((r) => setTimeout(r, 0));

      const sourceItems = ["id1", "id2"];
      const targetItem = "..";
      const onComplete = vi.fn();
      wrapper.findComponent(FileExplorer).vm.$emit("moveItems", {
        sourceItems,
        targetItem,
        onComplete,
      });
      await nextTick();

      expect(dispatchSpy).toHaveBeenCalledWith("spaces/moveOrCopyItems", {
        itemIds: sourceItems,
        projectId: "someProjectId",
        destWorkflowGroupItemId: "root",
        collisionStrategy: "OVERWRITE",
        isCopy: false,
      });
      await flushPromises();
      expect(onComplete).toHaveBeenCalledWith(true);
    });

    it("should move items back to the parent directory", async () => {
      mockedAPI.desktop.getNameCollisionStrategy.mockReturnValue("OVERWRITE");
      const { wrapper, dispatchSpy } = await doMount({
        props: { projectId: "someProjectId" },
        mockResponse: {
          ...fetchWorkflowGroupContentResponse,
          path: [
            { id: "parentId", name: "Parent Directory" },
            { id: "currentDirectoryId", name: "Current Directory" },
          ],
        },
      });

      await new Promise((r) => setTimeout(r, 0));

      const sourceItems = ["id1", "id2"];
      const targetItem = "..";
      const onComplete = vi.fn();
      wrapper
        .findComponent(FileExplorer)
        .vm.$emit("moveItems", { sourceItems, targetItem, onComplete });
      await nextTick();

      expect(dispatchSpy).toHaveBeenCalledWith("spaces/moveOrCopyItems", {
        itemIds: sourceItems,
        projectId: "someProjectId",
        destWorkflowGroupItemId: "parentId",
        collisionStrategy: "OVERWRITE",
        isCopy: false,
      });
      await flushPromises();
      expect(onComplete).toHaveBeenCalledWith(true);
    });

    it("should not move items if collision handling returns cancel", async () => {
      mockedAPI.desktop.getNameCollisionStrategy.mockReturnValue("CANCEL");
      const { wrapper, dispatchSpy } = doMount({
        props: { projectId: "someProjectId" },
      });
      await new Promise((r) => setTimeout(r, 0));

      const sourceItems = ["id1", "id2"];
      const targetItem = "group1";
      const onComplete = vi.fn();
      wrapper
        .findComponent(FileExplorer)
        .vm.$emit("moveItems", { sourceItems, targetItem, onComplete });

      expect(dispatchSpy).not.toHaveBeenCalledWith("spaces/moveOrCopyItems", {
        itemIds: sourceItems,
        destWorkflowGroupItemId: targetItem,
        collisionStrategy: "CANCEL",
      });
      await nextTick();
      expect(onComplete).toHaveBeenCalledWith(false);
    });

    it("should show alert if at least one of the moved workflows is opened", async () => {
      const openProjects = [
        {
          origin: {
            spaceId: "local",
            itemId: "id2",
            ancestorItemIds: ["1", "7"],
          },
          name: "test2",
        },
      ];
      const { wrapper } = doMount({
        openProjects,
        props: { projectId: "someProjectId" },
      });
      await new Promise((r) => setTimeout(r, 0));

      window.alert = vi.fn();
      const sourceItems = ["id1", "id2"];
      const targetItem = "group1";
      const onComplete = vi.fn();
      wrapper
        .findComponent(FileExplorer)
        .vm.$emit("moveItems", { sourceItems, targetItem, onComplete });

      expect(window.alert).toHaveBeenCalledWith(
        // eslint-disable-next-line vitest/no-conditional-tests
        expect.stringContaining("Following workflows are opened:" && "• test2"),
      );
      await nextTick();
      expect(onComplete).toHaveBeenCalledWith(false);
    });
  });

  describe("add node to workflow canvas", () => {
    it("should not attempt to add a node to canvas when the workflow is not displayed", async () => {
      // @ts-ignore
      useRoute.mockImplementationOnce(() => ({
        name: APP_ROUTES.SpaceBrowsingPage,
      }));
      document.elementFromPoint = vi.fn().mockReturnValue(null);
      const { wrapper, dispatchSpy } = await doMountAndLoad();

      // mockRoute.name = APP_ROUTES.SpaceBrowsingPage;

      const onComplete = vi.fn();

      const sourceItem = createMockWorkflow({
        id: "0",
        name: "WORKFLOW_NAME",
      });

      const event = new MouseEvent("dragend") as DragEvent;
      wrapper.findComponent(FileExplorer).vm.$emit("dragend", {
        event,
        sourceItem,
        onComplete,
      });

      expect(dispatchSpy).not.toHaveBeenCalledWith(
        "workflow/addNode",
        expect.anything(),
      );
      await nextTick();
      expect(onComplete).toHaveBeenCalledWith(false);
    });

    it("should not add a node to canvas if a workflow is not writable", async () => {
      document.elementFromPoint = vi.fn().mockReturnValue(null);
      const { wrapper, store, dispatchSpy } = await doMountAndLoad({
        isWriteableMock: vi.fn(() => false),
        fileExtensionToNodeTemplateId: {
          test: "org.knime.test.test.nodeFactory",
        },
        mockResponse: {
          id: "test.id",
          path: [],
          items: [
            {
              id: "4",
              name: "testFile.test",
              type: SpaceItem.TypeEnum.Workflow,
            },
          ],
        },
      });

      store.state.spaces.activeSpaceProvider = {
        id: "local",
      };

      const event = new MouseEvent("dragend") as DragEvent;

      const sourceItem = createMockWorkflow({
        id: "0",
        name: "file.test",
      });

      const onComplete = vi.fn();

      wrapper.findComponent(FileExplorer).vm.$emit("dragend", {
        event,
        sourceItem,
        onComplete,
      });

      expect(dispatchSpy).not.toHaveBeenCalledWith(
        "workflow/addNode",
        expect.anything(),
      );
      await nextTick();
      expect(onComplete).toHaveBeenCalledWith(false);
    });

    it("should add a node to canvas when dragged from the file explorer", async () => {
      document.elementFromPoint = vi.fn().mockReturnValue(null);
      const { wrapper, store, dispatchSpy } = await doMountAndLoad({
        fileExtensionToNodeTemplateId: {
          test: "org.knime.test.test.nodeFactory",
        },
        mockResponse: {
          id: "test.id",
          path: [],
          items: [
            {
              id: "4",
              name: "testFile.test",
              type: SpaceItem.TypeEnum.Workflow,
            },
          ],
        },
      });

      store.state.spaces.activeSpaceProvider = {
        id: "local",
      };

      const event = new MouseEvent("dragend") as DragEvent;

      const sourceItem = createMockWorkflow({
        id: "0",
        name: "file.test",
      });

      const onComplete = vi.fn();

      wrapper.findComponent(FileExplorer).vm.$emit("dragend", {
        event,
        sourceItem,
        onComplete,
      });

      expect(dispatchSpy).toHaveBeenNthCalledWith(3, "workflow/addNode", {
        nodeFactory: {
          className: "org.knime.test.test.nodeFactory",
        },
        position: { x: 5, y: 5 },
        spaceItemReference: {
          itemId: "0",
          providerId: "local",
          spaceId: "local",
        },
        isComponent: false,
      });
      await new Promise((r) => setTimeout(r, 0));
      expect(onComplete).toHaveBeenCalledWith(true);
    });

    it("should add a component to canvas when dragged from the file explorer", async () => {
      document.elementFromPoint = vi.fn().mockReturnValue(null);
      const { wrapper, store, dispatchSpy } = await doMountAndLoad({
        // components don't have an extenssion associated to them
        fileExtensionToNodeTemplateId: {},
        mockResponse: {
          id: "test.id",
          path: [],
          items: [
            {
              id: "4",
              name: "MyComponent",
              type: SpaceItem.TypeEnum.Component,
            },
          ],
        },
      });

      store.state.spaces.activeSpaceProvider = {
        id: "local",
      };

      const event = new MouseEvent("dragend") as DragEvent;
      const sourceItem = createMockWorkflow({
        id: "0",
        name: "file.test",
        meta: {
          type: SpaceItem.TypeEnum.Component,
        },
      });
      const onComplete = vi.fn();

      wrapper.findComponent(FileExplorer).vm.$emit("dragend", {
        event,
        sourceItem,
        onComplete,
      });

      expect(dispatchSpy).toHaveBeenNthCalledWith(3, "workflow/addNode", {
        nodeFactory: null,
        position: { x: 5, y: 5 },
        spaceItemReference: {
          itemId: "0",
          providerId: "local",
          spaceId: "local",
        },
        isComponent: true,
      });
      await new Promise((r) => setTimeout(r, 0));
      expect(onComplete).toHaveBeenCalledWith(true);
    });

    it("should display the NodePreview when dragging supported file above canvas", async () => {
      document.elementFromPoint = vi
        .fn()
        .mockReturnValue({ id: "someElementThatIsNotNull" });
      const { wrapper, store } = await doMountAndLoad({
        fileExtensionToNodeTemplateId: {
          test: "org.knime.test.test.nodeFactory",
        },
        mockResponse: {
          id: "test.id",
          path: [],
          items: [
            {
              id: "4",
              name: "testFile.test",
              type: SpaceItem.TypeEnum.Workflow,
            },
          ],
        },
      });

      store.state.spaces.activeSpaceProvider = {
        id: "local",
      };

      const item = createMockWorkflow({
        id: "0",
        name: "testfile.test",
      });
      const event = new MouseEvent("dragend") as DragEvent;

      wrapper.findComponent(FileExplorer).vm.$emit("drag", { event, item });

      await new Promise((r) => setTimeout(r, 0));
      expect(wrapper.findComponent(NodePreview).exists()).toBe(true);
    });
  });
});
