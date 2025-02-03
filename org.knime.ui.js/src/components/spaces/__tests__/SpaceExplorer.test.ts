/* eslint-disable max-lines */
import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { API } from "@api";
import { useRoute } from "vue-router";

import { Breadcrumb, FileExplorer, NodePreview } from "@knime/components";
import type { FileExplorerItem } from "@knime/components";

import {
  NativeNodeInvariants,
  type Project,
  SpaceItem,
} from "@/api/gateway-api/generated-api";
import { useConfirmDialog } from "@/composables/useConfirmDialog";
import { getToastsProvider } from "@/plugins/toasts";
import { APP_ROUTES } from "@/router/appRoutes";
import { createProject, createSpaceProvider } from "@/test/factories";
import { deepMocked, mockedObject } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";
import SpaceExplorer from "../SpaceExplorer.vue";

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

const fetchWorkflowGroupContentResponse: Awaited<
  ReturnType<typeof API.space.listWorkflowGroup>
> = {
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

vi.mock("@knime/components", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    // @ts-ignore
    ...actual,
    useToasts: vi.fn(),
  };
});

vi.mock("vue-router", async (importOriginal) => ({
  ...(await importOriginal()),
  useRouter: vi.fn(() => ({ push: () => {} })),
  useRoute: vi.fn(() => ({ name: APP_ROUTES.WorkflowPage, params: {} })),
}));

describe("SpaceExplorer.vue", () => {
  const toast = mockedObject(getToastsProvider());

  const doMount = ({
    props = {} as Partial<InstanceType<typeof SpaceExplorer>["$props"]>,
    mockResponse = fetchWorkflowGroupContentResponse,
    mockGetSpaceItems = null,
    openProjects = [] as Project[],
    fileExtensionToNodeTemplateId = {},
    isWriteable = true,
  } = {}) => {
    if (mockGetSpaceItems) {
      mockedAPI.space.listWorkflowGroup.mockImplementation(mockGetSpaceItems);
    } else {
      mockedAPI.space.listWorkflowGroup.mockResolvedValue(mockResponse);
    }
    mockedAPI.space.createWorkflow.mockResolvedValue({ type: "Workflow" });

    const mockedStores = mockStores();

    mockedStores.applicationStore.$patch({
      openProjects,
      fileExtensionToNodeTemplateId,
    });

    vi.mocked(
      mockedStores.desktopInteractionsStore.forceCloseProjects,
    ).mockImplementation(vi.fn());
    vi.mocked(
      mockedStores.globalLoaderStore.updateGlobalLoader,
    ).mockImplementation(vi.fn());
    vi.mocked(mockedStores.nodeInteractionsStore.addNode).mockResolvedValue(
      "mockNewNodeId",
    );
    // @ts-expect-error
    mockedStores.workflowStore.isWritable = isWriteable;
    // @ts-expect-error
    mockedStores.canvasStore.screenToCanvasCoordinates = vi
      .fn()
      .mockReturnValue([5, 5]);
    vi.mocked(
      mockedStores.nodeTemplatesStore.getSingleNodeTemplate,
    ).mockResolvedValue({
      id: "test.id",
      name: "test.test",
      type: NativeNodeInvariants.TypeEnum.Other,
      inPorts: [],
      outPorts: [],
      icon: "data:image/icon",
    });

    mockedStores.canvasStore.getScrollContainerElement().contains = vi
      .fn()
      .mockReturnValue(true);

    // default state of default project
    mockedStores.spaceCachingStore.projectPath = {
      someProjectId: {
        spaceId: "local",
        spaceProviderId: "local",
        itemId: "root",
      },
    };

    const local = createSpaceProvider();
    const other = createSpaceProvider({
      id: "provider",
    });
    mockedStores.spaceProvidersStore.setSpaceProviders({
      [local.id]: local,
      [other.id]: other,
    });

    const $shortcuts = {
      get: vi.fn().mockImplementation((name) => ({
        text: name,
        hotkeyText: "hotkeyText",
      })),
    };

    const wrapper = mount(SpaceExplorer, {
      props: { selectedItemIds: [], projectId: "", virtual: false, ...props },
      global: {
        plugins: [mockedStores.testingPinia],
        stubs: { NuxtLink: true, FocusTrap: true, NodePreview: true },
        mocks: {
          $shortcuts,
          $shapes: { nodeSize: 32 },
        },
      },
    });

    return { wrapper, mockedStores };
  };

  const doMountAndLoad = async ({
    props = {
      projectId: "someProjectId",
      mode: "normal" as const,
    },
    mockResponse = fetchWorkflowGroupContentResponse,
    mockGetSpaceItems = null,
    openProjects = [] as Project[],
    fileExtensionToNodeTemplateId = {},
    isWriteable = true,
  } = {}) => {
    const mountResult = doMount({
      props,
      mockResponse,
      mockGetSpaceItems,
      openProjects,
      fileExtensionToNodeTemplateId,
      isWriteable,
    });

    await flushPromises();

    return mountResult;
  };

  it("should load root directory data on created", async () => {
    const { wrapper } = await doMountAndLoad();
    await flushPromises();

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
    const { wrapper, mockedStores } = await doMountAndLoad();

    // initial fetch of root has happened
    mockedAPI.space.listWorkflowGroup.mockResolvedValue({
      path: [],
      items: [],
    });

    mockedStores.spaceCachingStore.setProjectPath({
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

  it.each([
    ["itemId", "someItem"],
    ["spaceId", "anotherSpaceId"],
    ["spaceProviderId", "anotherProvider"],
  ])(
    "should load data on changes to the current projectPath values %s",
    async (projectPathKey, projectPathValue) => {
      const { mockedStores } = await doMountAndLoad();

      // initial fetch of root has happened
      mockedAPI.space.listWorkflowGroup.mockResolvedValue({
        path: [],
        items: [],
      });

      mockedStores.spaceCachingStore.setProjectPath({
        projectId: "someProjectId",
        value: {
          ...mockedStores.spaceCachingStore.projectPath.someProjectId,
          [projectPathKey]: projectPathValue,
        },
      });

      await nextTick();

      expect(mockedAPI.space.listWorkflowGroup).toHaveBeenCalledWith(
        expect.objectContaining({ [projectPathKey]: projectPathValue }),
      );
    },
  );

  describe("navigate", () => {
    it("emits event to request a change of the directory", async () => {
      const { wrapper } = await doMountAndLoad();

      wrapper.findComponent(FileExplorer).vm.$emit("changeDirectory", "1234");

      await flushPromises();
      expect(wrapper.emitted("changeDirectory")![0][0]).toBe("1234");
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

      await flushPromises();
      expect(wrapper.emitted("changeDirectory")![0][0]).toBe("parentId");
    });
  });

  describe("open indicator", () => {
    it("should set the openIndicator for open workflows", async () => {
      const openProjects = [
        createProject({
          origin: {
            providerId: "local",
            spaceId: "local",
            itemId: fetchWorkflowGroupContentResponse.items[2].id,
          },
        }),
      ];
      const { wrapper } = await doMountAndLoad({ openProjects });

      expect(wrapper.findComponent(FileExplorer).props("items")[2]).toEqual(
        expect.objectContaining({ isOpen: true }),
      );
    });

    it("should set the openIndicator for folders with open workflows", async () => {
      const openProjects = [
        createProject({
          origin: {
            providerId: "local",
            spaceId: "local",
            itemId: "8",
            ancestorItemIds: ["1", "7"],
          },
        }),
      ];
      const { wrapper } = await doMountAndLoad({ openProjects });
      expect(wrapper.findComponent(FileExplorer).props("items")[0]).toEqual(
        expect.objectContaining({ isOpen: true }),
      );
    });
  });

  it("should open a workflow", async () => {
    const { wrapper, mockedStores } = await doMountAndLoad();

    wrapper
      .findComponent(FileExplorer)
      .vm.$emit("openFile", createMockWorkflow());

    await nextTick();

    expect(mockedStores.spaceOperationsStore.openProject).toHaveBeenCalledWith({
      providerId: "local",
      spaceId: "local",
      itemId: "dummy",
      $router: expect.anything(),
    });
  });

  it("should open a shared component", async () => {
    const { wrapper, mockedStores } = await doMountAndLoad();

    wrapper
      .findComponent(FileExplorer)
      .vm.$emit("openFile", createMockComponent());

    await nextTick();

    expect(mockedStores.spaceOperationsStore.openProject).toHaveBeenCalledWith({
      providerId: "local",
      spaceId: "local",
      itemId: "dummy",
      $router: expect.anything(),
    });
  });

  it("should filter items when filter field is used", async () => {
    const { wrapper } = await doMountAndLoad();
    await wrapper.setProps({ filterQuery: "folder 2" });
    expect(wrapper.findComponent(FileExplorer).props("items")[0].name).toBe(
      "Folder 2",
    );
  });

  describe("renaming", () => {
    it("should rename items", async () => {
      const { wrapper, mockedStores } = await doMountAndLoad();
      const itemId = "12345";
      const newName = "some name";
      wrapper
        .findComponent(FileExplorer)
        .vm.$emit("renameFile", { itemId, newName });
      expect(mockedStores.spaceOperationsStore.renameItem).toHaveBeenCalledWith(
        {
          projectId: "someProjectId",
          itemId,
          newName,
        },
      );
    });

    it("should not allow renaming open workflows or folders with open workflows", async () => {
      const openProjects = [
        createProject({
          origin: {
            providerId: "local",
            spaceId: "local",
            itemId: "8",
            ancestorItemIds: ["1", "7"],
          },
        }),
        createProject({
          origin: {
            providerId: "local",
            spaceId: "local",
            itemId: "4",
          },
        }),
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

      const { wrapper, mockedStores } = await doMountAndLoad();

      const sourceItems = ["id1", "id2"];

      // call the handler
      // (we can't trigger easily via the FileExplorer as it needs to
      // have an open context menu which requires a lot of mocks)
      // @ts-expect-error
      wrapper.vm.onDuplicateItems(sourceItems);

      expect(
        mockedStores.spaceOperationsStore.moveOrCopyItems,
      ).toHaveBeenNthCalledWith(1, {
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
        createProject({
          origin: {
            providerId: "local",
            spaceId: "local",
            itemId: "8",
            ancestorItemIds: ["1", "7"],
          },
        }),
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
      const { isActive } = useConfirmDialog();

      const items: FileExplorerItem[] = [
        createMockWorkflow({
          id: "item0",
          name: "WORKFLOW_NAME",
        }),
      ];
      const { wrapper } = await doMountAndLoad();

      expect(isActive.value).toBe(false);

      wrapper.findComponent(FileExplorer).vm.$emit("deleteItems", { items });

      expect(isActive.value).toBe(true);
    });

    it("should trigger closeItems before deleteItems onDeleteItems", async () => {
      const { confirm } = useConfirmDialog();

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
      const { wrapper, mockedStores } = await doMountAndLoad({ openProjects });

      wrapper.findComponent(FileExplorer).vm.$emit("deleteItems", { items });
      confirm();
      await flushPromises();

      expect(
        mockedStores.spaceOperationsStore.deleteItems,
      ).toHaveBeenNthCalledWith(1, {
        itemIds: ["item0"],
        projectId: "someProjectId",
        $router: expect.anything(),
      });

      expect(
        mockedStores.desktopInteractionsStore.forceCloseProjects,
      ).toHaveBeenNthCalledWith(1, { projectIds: [openProjects[0].projectId] });
    });

    it("should not delete item on negative response", async () => {
      const { cancel } = useConfirmDialog();

      const items: FileExplorerItem[] = [
        createMockWorkflow({
          id: "item0",
          name: "WORKFLOW_NAME",
        }),
      ];
      vi.spyOn(window, "confirm").mockImplementation(() => false);
      const { wrapper, mockedStores } = await doMountAndLoad();

      wrapper.findComponent(FileExplorer).vm.$emit("deleteItems", { items });

      cancel();
      await flushPromises();

      expect(
        mockedStores.spaceOperationsStore.deleteItems,
      ).not.toHaveBeenCalledWith({
        itemIds: ["item0"],
      });
      expect(
        mockedStores.spaceOperationsStore.deleteItems,
      ).not.toHaveBeenCalled();
    });
  });

  describe("move items", () => {
    it("should move items", async () => {
      mockedAPI.desktop.getNameCollisionStrategy.mockReturnValue("OVERWRITE");
      const { wrapper, mockedStores } = await doMountAndLoad();
      await flushPromises();

      const sourceItems = ["id1", "id2"];
      const targetItem = "group1";
      const onComplete = vi.fn();
      wrapper
        .findComponent(FileExplorer)
        .vm.$emit("moveItems", { sourceItems, targetItem, onComplete });
      await nextTick();

      expect(
        mockedStores.spaceOperationsStore.moveOrCopyItems,
      ).toHaveBeenCalledWith({
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
      const { wrapper, mockedStores } = doMount({
        props: { projectId: "someProjectId" },
        mockResponse: {
          ...fetchWorkflowGroupContentResponse,
          path: [{ id: "currentDirectoryId", name: "Current Directory" }],
        },
      });
      await flushPromises();

      const sourceItems = ["id1", "id2"];
      const targetItem = "..";
      const onComplete = vi.fn();
      wrapper.findComponent(FileExplorer).vm.$emit("moveItems", {
        sourceItems,
        targetItem,
        onComplete,
      });
      await nextTick();

      expect(
        mockedStores.spaceOperationsStore.moveOrCopyItems,
      ).toHaveBeenCalledWith({
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
      const { wrapper, mockedStores } = await doMount({
        props: { projectId: "someProjectId" },
        mockResponse: {
          ...fetchWorkflowGroupContentResponse,
          path: [
            { id: "parentId", name: "Parent Directory" },
            { id: "currentDirectoryId", name: "Current Directory" },
          ],
        },
      });

      await flushPromises();

      const sourceItems = ["id1", "id2"];
      const targetItem = "..";
      const onComplete = vi.fn();
      wrapper
        .findComponent(FileExplorer)
        .vm.$emit("moveItems", { sourceItems, targetItem, onComplete });
      await nextTick();

      expect(
        mockedStores.spaceOperationsStore.moveOrCopyItems,
      ).toHaveBeenCalledWith({
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
      const { wrapper, mockedStores } = doMount({
        props: { projectId: "someProjectId" },
      });
      await flushPromises();

      const sourceItems = ["id1", "id2"];
      const targetItem = "group1";
      const onComplete = vi.fn();
      wrapper
        .findComponent(FileExplorer)
        .vm.$emit("moveItems", { sourceItems, targetItem, onComplete });

      expect(
        mockedStores.spaceOperationsStore.moveOrCopyItems,
      ).not.toHaveBeenCalledWith({
        itemIds: sourceItems,
        destWorkflowGroupItemId: targetItem,
        collisionStrategy: "CANCEL",
      });
      await nextTick();
      expect(onComplete).toHaveBeenCalledWith(false);
    });

    it("should show toast if at least one of the moved workflows is opened", async () => {
      const openProjects = [
        createProject({
          origin: {
            spaceId: "local",
            itemId: "id2",
            ancestorItemIds: ["1", "7"],
          },
          name: "test2",
        }),
      ];
      const { wrapper } = doMount({
        openProjects,
        props: { projectId: "someProjectId" },
      });
      await flushPromises();

      const sourceItems = ["id1", "id2"];
      const targetItem = "group1";
      const onComplete = vi.fn();
      wrapper
        .findComponent(FileExplorer)
        .vm.$emit("moveItems", { sourceItems, targetItem, onComplete });

      expect(toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          headline: "Could not move items",
          component: expect.objectContaining({
            props: {
              isCopy: false,
              openedItemNames: ["test2"],
            },
          }),
        }),
      );

      await nextTick();
      expect(onComplete).toHaveBeenCalledWith(false);
    });
  });

  describe("add node to workflow canvas", () => {
    it("should not attempt to add a node to canvas when the workflow is not displayed", async () => {
      // @ts-ignore
      useRoute.mockImplementationOnce(() => ({
        name: APP_ROUTES.Home.SpaceBrowsingPage,
        params: {},
      }));
      document.elementFromPoint = vi.fn().mockReturnValue(null);
      const { wrapper, mockedStores } = await doMountAndLoad();

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

      expect(mockedStores.nodeInteractionsStore.addNode).not.toHaveBeenCalled();
      await nextTick();
      expect(onComplete).toHaveBeenCalledWith(false);
    });

    it("should not add a node to canvas if a workflow is not writable", async () => {
      document.elementFromPoint = vi.fn().mockReturnValue(null);
      const { wrapper, mockedStores } = await doMountAndLoad({
        isWriteable: false,
        fileExtensionToNodeTemplateId: {
          test: "org.knime.test.test.nodeFactory",
        },
        mockResponse: {
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

      expect(mockedStores.nodeInteractionsStore.addNode).not.toHaveBeenCalled();
      await nextTick();
      expect(onComplete).toHaveBeenCalledWith(false);
    });

    it("should add a node to canvas when dragged from the file explorer", async () => {
      document.elementFromPoint = vi.fn().mockReturnValue(null);
      const { wrapper, mockedStores } = await doMountAndLoad({
        fileExtensionToNodeTemplateId: {
          test: "org.knime.test.test.nodeFactory",
        },
        mockResponse: {
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

      expect(
        mockedStores.nodeInteractionsStore.addNode,
      ).toHaveBeenNthCalledWith(1, {
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
      await flushPromises();
      expect(onComplete).toHaveBeenCalledWith(true);
    });

    it("should add a component to canvas when dragged from the file explorer", async () => {
      document.elementFromPoint = vi.fn().mockReturnValue(null);
      const { wrapper, mockedStores } = await doMountAndLoad({
        // components don't have an extension associated to them
        fileExtensionToNodeTemplateId: {},
        mockResponse: {
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

      expect(
        mockedStores.nodeInteractionsStore.addNode,
      ).toHaveBeenNthCalledWith(1, {
        nodeFactory: undefined,
        position: { x: 5, y: 5 },
        spaceItemReference: {
          itemId: "0",
          providerId: "local",
          spaceId: "local",
        },
        isComponent: true,
      });
      await flushPromises();
      expect(onComplete).toHaveBeenCalledWith(true);
    });

    it("should display the NodePreview when dragging supported file above canvas", async () => {
      document.elementFromPoint = vi
        .fn()
        .mockReturnValue({ id: "someElementThatIsNotNull" });
      const { wrapper } = await doMountAndLoad({
        fileExtensionToNodeTemplateId: {
          test: "org.knime.test.test.nodeFactory",
        },
        mockResponse: {
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

      const item = createMockWorkflow({
        id: "0",
        name: "testfile.test",
      });
      const event = new MouseEvent("dragend") as DragEvent;

      wrapper.findComponent(FileExplorer).vm.$emit("drag", { event, item });

      await flushPromises();
      expect(wrapper.findComponent(NodePreview).exists()).toBe(true);
    });
  });
});
