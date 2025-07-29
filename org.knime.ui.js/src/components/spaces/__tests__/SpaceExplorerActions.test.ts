import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { API } from "@api";

import { SubMenu } from "@knime/components";

import { SpaceProviderNS } from "@/api/custom-types";
import { createSpace, createSpaceProvider } from "@/test/factories";
import { deepMocked } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";
import { getToastPresets } from "@/toastPresets";
import SpaceExplorerActionButton from "../SpaceExplorerActionButton.vue";
import SpaceExplorerActions from "../SpaceExplorerActions.vue";
import SpaceExplorerFloatingButton from "../SpaceExplorerFloatingButton.vue";

const mockedAPI = deepMocked(API);

mockedAPI.desktop.importWorkflows.mockResolvedValue([]);
mockedAPI.desktop.importFiles.mockResolvedValue([]);
mockedAPI.space.listWorkflowGroup.mockResolvedValue([]);

mockedAPI.space.createWorkflowGroup.mockResolvedValue({
  id: "NewFolder",
  type: "WorkflowGroup",
});

vi.mock("@/api/gateway-api/exceptions");
vi.mock("@knime/components", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    // @ts-expect-error
    ...actual,
    useToasts: vi.fn(),
  };
});

vi.mock("vue-router", async (importOriginal) => ({
  ...(await importOriginal()),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  useRoute: vi.fn(),
}));

describe("SpaceExplorerActions.vue", () => {
  const doMount = ({ props = {} } = {}) => {
    const mockedStores = mockStores();
    const projectId = "someProjectId";

    const wrapper = mount(SpaceExplorerActions, {
      props: {
        projectId,
        selectedItemIds: ["934383"],
        ...props,
      },
      global: {
        plugins: [mockedStores.testingPinia],
        mocks: { $shortcuts: { get: vi.fn(() => ({})) } },
      },
    });

    return { wrapper, mockedStores, projectId };
  };

  const setupStoreWithProvider = async (
    mockedStores: ReturnType<typeof mockStores>,
    projectId: string,
    providerType: SpaceProviderNS.TypeEnum,
  ) => {
    mockedStores.spaceCachingStore.setProjectPath({
      projectId,
      value: {
        spaceId: "space1",
        spaceProviderId: "provider1",
        itemId: "item1",
      },
    });

    const provider = createSpaceProvider({
      id: "provider1",
      type: providerType,
      spaceGroups: [
        {
          id: "group1",
          name: "Group 1",
          type: SpaceProviderNS.UserTypeEnum.USER,
          spaces: [createSpace({ id: "space1" })],
        },
      ],
    });

    mockedStores.spaceProvidersStore.setSpaceProviders({
      [provider.id]: provider,
    });

    await nextTick();
  };

  describe("normal mode", () => {
    it("should render actions for local space", async () => {
      const { wrapper, mockedStores, projectId } = doMount();

      await setupStoreWithProvider(
        mockedStores,
        projectId,
        SpaceProviderNS.TypeEnum.LOCAL,
      );

      expect(wrapper.find(".toolbar-actions-normal").exists()).toBe(true);
      expect(wrapper.find(".toolbar-actions-mini").exists()).toBe(false);

      expect(wrapper.text()).toMatch("Create folder");
      expect(wrapper.text()).toMatch("Import workflow");
      expect(wrapper.text()).toMatch("Add files");
      expect(wrapper.text()).toMatch("Upload");
      expect(wrapper.text()).toMatch("Reload");

      expect(wrapper.findComponent(SpaceExplorerFloatingButton).exists()).toBe(
        true,
      );
      expect(wrapper.findAllComponents(SpaceExplorerActionButton).length).toBe(
        5,
      );
    });

    it("should render actions for hub", async () => {
      const { wrapper, mockedStores, projectId } = doMount();

      await setupStoreWithProvider(
        mockedStores,
        projectId,
        SpaceProviderNS.TypeEnum.HUB,
      );

      expect(wrapper.find(".toolbar-actions-normal").exists()).toBe(true);
      expect(wrapper.find(".toolbar-actions-mini").exists()).toBe(false);

      expect(wrapper.text()).toMatch("Create folder");
      expect(wrapper.text()).toMatch("Import workflow");
      expect(wrapper.text()).toMatch("Add files");
      expect(wrapper.text()).toMatch("Download");
      expect(wrapper.text()).toMatch("Import workflow");
      expect(wrapper.text()).toMatch("Add files");
      expect(wrapper.text()).toMatch("Reload");

      expect(wrapper.findComponent(SpaceExplorerFloatingButton).exists()).toBe(
        true,
      );
      expect(wrapper.findAllComponents(SpaceExplorerActionButton).length).toBe(
        7,
      );
    });

    it("should disable actions that require selected items", async () => {
      const { wrapper, mockedStores, projectId } = doMount({
        props: {
          selectedItemIds: [],
        },
      });

      await setupStoreWithProvider(
        mockedStores,
        projectId,
        SpaceProviderNS.TypeEnum.HUB,
      );

      expect(
        wrapper.find("#downloadToLocalSpace").attributes("aria-disabled"),
      ).toBeTruthy();
      expect(wrapper.find("#createFolder").attributes("disabled")).toBeFalsy();
      expect(wrapper.find("#importFiles").attributes("disabled")).toBeFalsy();
    });

    it.each([
      ["createFolder", "createFolder", {}],
      [
        "downloadToLocalSpace",
        "moveToLocalProviderFromHub",
        { projectId: "someProjectId" },
      ],
      ["importFiles", "importToWorkflowGroup", { importType: "FILES" }],
      ["importWorkflow", "importToWorkflowGroup", { importType: "WORKFLOW" }],
    ])("should call %s store action", async (actionId, storeAction, params) => {
      const { wrapper, mockedStores, projectId } = doMount();

      await setupStoreWithProvider(
        mockedStores,
        projectId,
        SpaceProviderNS.TypeEnum.HUB,
      );

      wrapper.find(`#${actionId}`).trigger("click");
      expect(
        mockedStores.spaceOperationsStore[storeAction] ??
          mockedStores.spacesStore[storeAction] ??
          mockedStores.spaceDownloadsStore[storeAction],
      ).toHaveBeenCalledWith({
        projectId: "someProjectId",
        ...params,
      });
    });

    it("should open create workflow dialog  when clicking on the relevant action", () => {
      const { wrapper, mockedStores } = doMount();

      wrapper.findComponent(SpaceExplorerFloatingButton).vm.$emit("click");
      expect(
        mockedStores.spacesStore.setCreateWorkflowModalConfig,
      ).toHaveBeenCalledWith({
        isOpen: true,
        projectId: "someProjectId",
      });
    });
  });

  describe("mini mode", () => {
    it("should render actions for local space", async () => {
      const { wrapper, projectId, mockedStores } = doMount({
        props: {
          mode: "mini",
        },
      });

      await setupStoreWithProvider(
        mockedStores,
        projectId,
        SpaceProviderNS.TypeEnum.LOCAL,
      );

      expect(wrapper.find(".toolbar-actions-mini").exists()).toBe(true);
      expect(wrapper.find(".toolbar-actions-normal").exists()).toBe(false);

      // open submenu
      await wrapper.find(".submenu-toggle").trigger("click");

      const items = wrapper.findComponent(SubMenu).props("items");

      const allItems = items.map((item) => item.text).join("\n");

      expect(allItems).toMatch("Upload");
      expect(allItems).toMatch("Create folder");
      expect(allItems).toMatch("Import workflow");
      expect(allItems).toMatch("Create workflow");
      expect(allItems).toMatch("Add files");

      expect(wrapper.findComponent(SubMenu).exists()).toBe(true);
      expect(items.length).toBe(5);
    });

    it("should render actions for hub", async () => {
      const { wrapper, mockedStores, projectId } = doMount({
        props: { mode: "mini" },
      });

      await setupStoreWithProvider(
        mockedStores,
        projectId,
        SpaceProviderNS.TypeEnum.HUB,
      );

      expect(wrapper.find(".toolbar-actions-mini").exists()).toBe(true);
      expect(wrapper.find(".toolbar-actions-normal").exists()).toBe(false);

      // open submenu
      await wrapper.find(".submenu-toggle").trigger("click");

      expect(wrapper.findComponent(SubMenu).exists()).toBe(true);

      const items = wrapper.findComponent(SubMenu).props("items");

      const allItems = items.map((item) => item.text).join("\n");

      expect(allItems).toMatch("Download");
      expect(allItems).toMatch("Move to...");
      expect(allItems).toMatch("Create folder");
      expect(allItems).toMatch("Create workflow");
      expect(allItems).toMatch("Import workflow");
      expect(allItems).toMatch("Add files");

      expect(items.length).toBe(7);
    });

    it("should disable download action because it requires selected items", async () => {
      const { wrapper, mockedStores, projectId } = doMount({
        props: {
          mode: "mini",
          selectedItemIds: [],
        },
      });

      await setupStoreWithProvider(
        mockedStores,
        projectId,
        SpaceProviderNS.TypeEnum.HUB,
      );

      expect(wrapper.findComponent(SubMenu).props("items")).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: "downloadToLocalSpace",
            disabled: true,
          }),
        ]),
      );
    });

    it.each([
      ["upload", "moveToHubFromLocalProvider", { itemIds: ["934383"] }],
    ])("upload selected items", async (actionId, storeAction, params) => {
      const { wrapper, mockedStores, projectId } = doMount({
        props: { mode: "mini" },
      });

      await setupStoreWithProvider(
        mockedStores,
        projectId,
        SpaceProviderNS.TypeEnum.LOCAL,
      );

      const subMenu = wrapper.findComponent(SubMenu);
      const item = subMenu.props("items").find((item) => item.id === actionId);
      subMenu.vm.$emit("item-click", null, item);

      expect(mockedStores.spaceUploadsStore[storeAction]).toHaveBeenCalledWith({
        ...params,
      });
    });

    it.each([
      ["createFolder", "createFolder", {}],
      ["importFiles", "importToWorkflowGroup", { importType: "FILES" }],
      ["importWorkflow", "importToWorkflowGroup", { importType: "WORKFLOW" }],
    ])(
      "should execute action %s via store",
      async (actionId, storeAction, params) => {
        const { wrapper, mockedStores, projectId } = doMount({
          props: { mode: "mini" },
        });

        await setupStoreWithProvider(
          mockedStores,
          projectId,
          SpaceProviderNS.TypeEnum.LOCAL,
        );

        const subMenu = wrapper.findComponent(SubMenu);
        const item = subMenu
          .props("items")
          .find((item) => item.id === actionId);
        subMenu.vm.$emit("item-click", null, item);

        expect(
          mockedStores.spaceOperationsStore[storeAction] ??
            mockedStores.spacesStore[storeAction],
        ).toHaveBeenCalledWith({
          projectId: "someProjectId",
          ...params,
        });
      },
    );

    it.each([["createFolder", "createFolder", {}]])(
      "should handle failure when executing '%s' store-action",
      async (actionId, storeAction, params) => {
        const { toastPresets } = getToastPresets();
        const createFolderFailed = vi.spyOn(
          toastPresets.spaces.crud,
          "createFolderFailed",
        );

        const { wrapper, mockedStores, projectId } = doMount({
          props: { mode: "mini" },
        });

        await setupStoreWithProvider(
          mockedStores,
          projectId,
          SpaceProviderNS.TypeEnum.LOCAL,
        );

        mockedStores.spaceOperationsStore[storeAction].mockRejectedValueOnce({
          code: -32600,
          data: {
            code: "ServiceCallException",
            title: "error message",
            canCopy: false,
            message: "error message",
          },
        });

        const subMenu = wrapper.findComponent(SubMenu);
        const item = subMenu
          .props("items")
          .find((item) => item.id === actionId);
        subMenu.vm.$emit("item-click", null, item);

        expect(
          mockedStores.spaceOperationsStore[storeAction],
        ).toHaveBeenCalledWith({
          projectId: "someProjectId",
          ...params,
        });

        await flushPromises();

        expect(createFolderFailed).toHaveBeenCalled();
      },
    );
  });
});
