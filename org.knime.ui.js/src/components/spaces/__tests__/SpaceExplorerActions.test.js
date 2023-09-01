import { expect, describe, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

import PlusButton from "webapps-common/ui/components/PlusButton.vue";
import SubMenu from "webapps-common/ui/components/SubMenu.vue";

import { deepMocked, mockVuexStore } from "@/test/utils";
import * as spacesStore from "@/store/spaces";
import { API } from "@api";
import { createSpaceProvider } from "@/test/factories";
import { SpaceProviderNS } from "@/api/custom-types";
import SpaceExplorerActions from "../SpaceExplorerActions.vue";

const mockedAPI = deepMocked(API);

mockedAPI.space.createWorkflowGroup.mockResolvedValue({
  id: "NewFolder",
  type: "WorkflowGroup",
});

describe("SpaceExplorerActions.vue", () => {
  const doMount = ({
    props = {},
    projectPath = null,
    spaceProvider = null,
    moreSpaceProviders = null,
  } = {}) => {
    const store = mockVuexStore({
      spaces: spacesStore,
    });

    const projectId = "someProjectId";

    const projectPathWithDefaults = {
      spaceId: "space",
      spaceProviderId: "provider",
      itemId: "root",
      ...projectPath,
    };

    store.commit("spaces/setProjectPath", {
      projectId,
      value: projectPathWithDefaults,
    });

    store.commit("spaces/setSpaceProviders", {
      [projectPathWithDefaults.spaceProviderId]: createSpaceProvider({
        id: projectPathWithDefaults.spaceProviderId,
        name: "Space Prov",
        connected: true,
        type: SpaceProviderNS.TypeEnum.HUB,
        spaces: [
          {
            id: projectPathWithDefaults.spaceId,
            name: "Space",
            owner: "some User",
            description: "Just a space",
            private: false,
          },
        ],
        ...spaceProvider,
      }),
      ...moreSpaceProviders,
    });

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
        stubs: { teleport: true },
      },
    });

    return { wrapper, store, dispatchSpy, commitSpy };
  };

  describe("normal mode", () => {
    it("should render actions for local space", () => {
      const { wrapper } = doMount({
        projectPath: {
          spaceId: "local",
          spaceProviderId: "local",
        },
      });

      expect(wrapper.find(".toolbar-actions-normal").exists()).toBe(true);
      expect(wrapper.find(".toolbar-actions-mini").exists()).toBe(false);

      expect(wrapper.text()).toMatch("Upload");
      expect(wrapper.text()).toMatch("Create folder");
      expect(wrapper.text()).toMatch("Import workflow");
      expect(wrapper.text()).toMatch("Add files");

      expect(wrapper.findComponent(PlusButton).exists()).toBe(true);
    });

    it("should render actions for hub", () => {
      const { wrapper } = doMount();

      expect(wrapper.find(".toolbar-actions-normal").exists()).toBe(true);
      expect(wrapper.find(".toolbar-actions-mini").exists()).toBe(false);

      expect(wrapper.text()).toMatch("Download to local space");
      expect(wrapper.text()).toMatch("Create folder");
      expect(wrapper.text()).toMatch("Import workflow");
      expect(wrapper.text()).toMatch("Add files");

      expect(wrapper.findComponent(PlusButton).exists()).toBe(true);
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
      ["openInBrowser", "spaces/openInBrowser", { itemId: "934383" }],
      ["importFiles", "spaces/importToWorkflowGroup", { importType: "FILES" }],
      [
        "importWorkflow",
        "spaces/importToWorkflowGroup",
        { importType: "WORKFLOW" },
      ],
    ])(
      "should call store actions on the action",
      (actionId, storeAction, params) => {
        const { wrapper, dispatchSpy } = doMount();

        wrapper.find(`#${actionId}`).trigger("click");
        expect(dispatchSpy).toHaveBeenCalledWith(storeAction, {
          projectId: "someProjectId",
          ...params,
        });
      },
    );

    it("should open create workflow dialog  when clicking on the relevant action", () => {
      const { wrapper, commitSpy } = doMount();

      wrapper.findComponent(PlusButton).vm.$emit("click");
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
      const { wrapper } = doMount({
        props: {
          mode: "mini",
        },
        projectPath: {
          spaceId: "local",
          spaceProviderId: "local",
        },
      });

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
      const { wrapper } = doMount({
        props: { mode: "mini" },
      });

      expect(wrapper.find(".toolbar-actions-mini").exists()).toBe(true);
      expect(wrapper.find(".toolbar-actions-normal").exists()).toBe(false);

      // open submenu
      await wrapper.find(".submenu-toggle").trigger("click");

      expect(wrapper.findComponent(SubMenu).exists()).toBe(true);

      const items = wrapper.findComponent(SubMenu).props("items");

      const allItems = items.map((item) => item.text).join("\n");

      expect(allItems).toMatch("Open in Hub");
      expect(allItems).toMatch("Download to local space");
      expect(allItems).toMatch("Create folder");
      expect(allItems).toMatch("Create workflow");
      expect(allItems).toMatch("Import workflow");
      expect(allItems).toMatch("Add files");

      expect(items.length).toBe(6);
    });

    it("shows multiple hubs to connect to in a sub menu", () => {
      const { wrapper } = doMount({
        props: {
          mode: "mini",
        },
        // local to have the upload and connect options
        projectPath: {
          spaceId: "local",
          spaceProviderId: "local",
        },
        moreSpaceProviders: {
          hub2: {
            id: "hub2",
            name: "Hub 2",
            connected: false,
            spaces: [],
          },
          hub3: {
            id: "hub3",
            name: "Hub 3",
            connected: false,
            spaces: [],
          },
        },
      });

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

    it("shows a single hub and triggers its connection on click", () => {
      const { wrapper, dispatchSpy } = doMount({
        props: {
          mode: "mini",
        },
        // local to have the upload and connect options
        projectPath: {
          spaceId: "local",
          spaceProviderId: "local",
        },
        moreSpaceProviders: {
          hub2: {
            id: "hub2",
            name: "Hub 2",
            connected: false,
            spaces: [],
          },
        },
      });

      expect(wrapper.findComponent(SubMenu).props("items")).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: "connectToHub",
            children: null,
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

    it("should disable upload if no provider is connected", () => {
      const { wrapper } = doMount({
        props: {
          mode: "mini",
        },
        projectPath: {
          spaceId: "local",
          spaceProviderId: "local",
        },
      });

      expect(wrapper.findComponent(SubMenu).props("items")).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: "upload",
            disabled: true,
          }),
        ]),
      );
    });

    it("should disable actions that require selected items (download and openInBrowser)", () => {
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
          expect.objectContaining({
            id: "openInBrowser",
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
      (actionId, storeAction, params) => {
        const { wrapper, dispatchSpy } = doMount({
          props: { mode: "mini" },
          projectPath: {
            spaceId: "local",
            spaceProviderId: "local",
          },
        });

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
  });
});
