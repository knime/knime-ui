import { expect, describe, it, vi } from "vitest";
import { nextTick } from "vue";
import type { Store } from "vuex";
import { mount } from "@vue/test-utils";

import { SubMenu } from "@knime/components";

import { createSpace, createSpaceProvider } from "@/test/factories";
import { deepMocked, mockVuexStore } from "@/test/utils";
import { API } from "@api";
import { SpaceProviderNS } from "@/api/custom-types";
import * as spacesStore from "@/store/spaces";
import type { RootStoreState } from "@/store/types";
import OptionalSubMenuActionButton from "@/components/common/OptionalSubMenuActionButton.vue";
import SpaceExplorerActions from "../SpaceExplorerActions.vue";
import SpaceExplorerFloatingButton from "../SpaceExplorerFloatingButton.vue";

const mockedAPI = deepMocked(API);

mockedAPI.desktop.importWorkflows.mockResolvedValue([]);
mockedAPI.desktop.importFiles.mockResolvedValue([]);

mockedAPI.space.createWorkflowGroup.mockResolvedValue({
  id: "NewFolder",
  type: "WorkflowGroup",
});

describe("SpaceExplorerActions.vue", () => {
  const doMount = ({ props = {} } = {}) => {
    const store = mockVuexStore({
      spaces: spacesStore,
    });

    const projectId = "someProjectId";

    const dispatchSpy = vi.spyOn(store, "dispatch");
    const commitSpy = vi.spyOn(store, "commit");

    const wrapper = mount(SpaceExplorerActions, {
      props: {
        projectId,
        selectedItemIds: ["934383"],
        ...props,
      },
      global: {
        plugins: [store],
        mocks: { $shortcuts: { get: vi.fn(() => ({})) } },
      },
    });

    return { wrapper, store, dispatchSpy, commitSpy, projectId };
  };

  const setupStoreWithProvider = async (
    store: Store<RootStoreState>,
    projectId: string,
    providerType: SpaceProviderNS.TypeEnum,
  ) => {
    store.commit("spaces/setProjectPath", {
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

    store.commit("spaces/setSpaceProviders", {
      [provider.id]: provider,
    });

    await nextTick();
  };

  describe("normal mode", () => {
    it("should render actions for local space", async () => {
      const { wrapper, store, projectId } = doMount();

      await setupStoreWithProvider(
        store,
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
      expect(
        wrapper.findAllComponents(OptionalSubMenuActionButton).length,
      ).toBe(5);
    });

    it("should render actions for hub", () => {
      const { wrapper } = doMount();

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
      expect(
        wrapper.findAllComponents(OptionalSubMenuActionButton).length,
      ).toBe(6);
    });

    it("should disable actions that require selected items", () => {
      const { wrapper } = doMount({
        props: {
          selectedItemIds: [],
        },
      });

      expect(
        wrapper.find("#downloadToLocalSpace").attributes("aria-disabled"),
      ).toBeTruthy();
      expect(wrapper.find("#createFolder").attributes("disabled")).toBeFalsy();
      expect(wrapper.find("#importFiles").attributes("disabled")).toBeFalsy();
    });

    it.each([
      ["createFolder", "spaces/createFolder", {}],
      [
        "downloadToLocalSpace",
        "spaces/copyBetweenSpaces",
        { itemIds: ["934383"] },
      ],
      ["importFiles", "spaces/importToWorkflowGroup", { importType: "FILES" }],
      [
        "importWorkflow",
        "spaces/importToWorkflowGroup",
        { importType: "WORKFLOW" },
      ],
    ])("should call %s store action", async (actionId, storeAction, params) => {
      const { wrapper, store, dispatchSpy, projectId } = doMount();

      await setupStoreWithProvider(
        store,
        projectId,
        SpaceProviderNS.TypeEnum.HUB,
      );

      wrapper.find(`#${actionId}`).trigger("click");
      expect(dispatchSpy).toHaveBeenCalledWith(storeAction, {
        projectId: "someProjectId",
        ...params,
      });
    });

    it("should open create workflow dialog  when clicking on the relevant action", () => {
      const { wrapper, commitSpy } = doMount();

      wrapper.findComponent(SpaceExplorerFloatingButton).vm.$emit("click");
      expect(commitSpy).toHaveBeenCalledWith(
        "spaces/setCreateWorkflowModalConfig",
        {
          isOpen: true,
          projectId: "someProjectId",
        },
      );
    });
  });

  describe("mini mode", () => {
    it("should render actions for local space", async () => {
      const { wrapper, projectId, store } = doMount({
        props: {
          mode: "mini",
        },
      });

      await setupStoreWithProvider(
        store,
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
      const { wrapper, store, projectId } = doMount({
        props: { mode: "mini" },
      });

      await setupStoreWithProvider(
        store,
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

      expect(items.length).toBe(6);
    });

    it("shows multiple hubs to connect to in a sub menu", async () => {
      const { wrapper, store, projectId } = doMount({
        props: { mode: "mini" },
      });

      await setupStoreWithProvider(
        store,
        projectId,
        SpaceProviderNS.TypeEnum.LOCAL,
      );

      store.commit("spaces/setSpaceProviders", {
        ...store.state.spaces.spaceProviders,
        hub2: createSpaceProvider({
          id: "hub2",
          name: "Hub 2",
          connected: false,
          type: SpaceProviderNS.TypeEnum.HUB,
        }),
        hub3: createSpaceProvider({
          id: "hub3",
          name: "Hub 3",
          connected: false,
          type: SpaceProviderNS.TypeEnum.HUB,
        }),
      });

      await nextTick();

      const items = wrapper.findComponent(SubMenu).props("items");

      expect(items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: "connectToHub",
            children: [
              expect.objectContaining({
                text: "Hub 2",
              }),
              expect.objectContaining({
                text: "Hub 3",
              }),
            ],
          }),
        ]),
      );
    });

    it("shows a single hub and triggers its connection on click", async () => {
      const { wrapper, store, projectId, dispatchSpy } = doMount({
        props: { mode: "mini" },
      });

      await setupStoreWithProvider(
        store,
        projectId,
        SpaceProviderNS.TypeEnum.LOCAL,
      );

      store.commit("spaces/setSpaceProviders", {
        ...store.state.spaces.spaceProviders,
        hub2: createSpaceProvider({
          id: "hub2",
          name: "Hub 2",
          connected: false,
          type: SpaceProviderNS.TypeEnum.HUB,
        }),
      });

      await nextTick();

      expect(wrapper.findComponent(SubMenu).props("items")).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: "connectToHub",
            children: undefined,
          }),
        ]),
      );

      const subMenu = wrapper.findComponent(SubMenu);
      const item = subMenu
        .props("items")
        .find((item) => item.id === "connectToHub");
      subMenu.vm.$emit("item-click", null, item);

      expect(dispatchSpy).toHaveBeenCalledWith("spaces/connectProvider", {
        spaceProviderId: "hub2",
      });
    });

    it("should disable upload if no provider is connected", async () => {
      const { wrapper, store, projectId } = doMount({
        props: { mode: "mini" },
      });

      await setupStoreWithProvider(
        store,
        projectId,
        SpaceProviderNS.TypeEnum.LOCAL,
      );

      expect(wrapper.findComponent(SubMenu).props("items")).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: "upload",
            disabled: true,
          }),
        ]),
      );
    });

    it("should disable download action because it requires selected items", () => {
      const { wrapper } = doMount({
        props: {
          mode: "mini",
          selectedItemIds: [],
        },
      });

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
      ["createFolder", "spaces/createFolder", {}],
      ["upload", "spaces/copyBetweenSpaces", { itemIds: ["934383"] }],
      ["importFiles", "spaces/importToWorkflowGroup", { importType: "FILES" }],
      [
        "importWorkflow",
        "spaces/importToWorkflowGroup",
        { importType: "WORKFLOW" },
      ],
    ])(
      "should execute action %s via store",
      async (actionId, storeAction, params) => {
        const { wrapper, store, projectId, dispatchSpy } = doMount({
          props: { mode: "mini" },
        });

        await setupStoreWithProvider(
          store,
          projectId,
          SpaceProviderNS.TypeEnum.LOCAL,
        );

        const subMenu = wrapper.findComponent(SubMenu);
        const item = subMenu
          .props("items")
          .find((item) => item.id === actionId);
        subMenu.vm.$emit("item-click", null, item);

        expect(dispatchSpy).toHaveBeenCalledWith(storeAction, {
          projectId: "someProjectId",
          ...params,
        });
      },
    );

    it.each([
      ["files", "importFiles", "importFiles"],
      ["workflows", "importWorkflow", "importWorkflows"],
    ])(
      "should emit imported %s after successful import",
      async (_name, menuId, apiName) => {
        // @ts-ignore
        mockedAPI.desktop[apiName].mockResolvedValue(["item1", "item2"]);
        const { wrapper, store, projectId } = doMount({
          props: { mode: "mini" },
        });

        await setupStoreWithProvider(
          store,
          projectId,
          SpaceProviderNS.TypeEnum.LOCAL,
        );

        const subMenu = wrapper.findComponent(SubMenu);
        const item = subMenu
          .props("items")
          .find(({ id }: { id: string }) => id === menuId);
        subMenu.vm.$emit("item-click", null, item);

        await new Promise((r) => setTimeout(r, 0));

        expect(wrapper.emitted("importedItemIds")).toStrictEqual([
          [["item1", "item2"]],
        ]);
      },
    );
  });
});
