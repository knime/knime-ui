import { expect, describe, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

import PlusButton from "webapps-common/ui/components/PlusButton.vue";
import SubMenu from "webapps-common/ui/components/SubMenu.vue";

import SpaceExplorerActions from "../SpaceExplorerActions.vue";
import { mockVuexStore } from "@/test/utils";
import * as spacesStore from "@/store/spaces";

describe("SpaceExplorerActions.vue", () => {
  const doMount = ({
    props = {},
    projectPath = null,
    spaceProvider = null,
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
      [projectPathWithDefaults.spaceProviderId]: {
        id: projectPathWithDefaults.spaceProviderId,
        name: "Space Prov",
        connected: true,
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
      },
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

      expect(wrapper.text()).toMatch("Upload to Hub");
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

    it("should disable actions", () => {
      const { wrapper } = doMount({
        props: {
          selectedItemIds: [],
        },
      });

      expect(
        wrapper.find("#downloadToLocalSpace").attributes("aria-disabled")
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
    ])(
      "should call store actions on the action",
      (actionId, storeAction, params) => {
        const { wrapper, dispatchSpy } = doMount();

        wrapper.find(`#${actionId}`).trigger("click");
        expect(dispatchSpy).toHaveBeenCalledWith(storeAction, {
          projectId: "someProjectId",
          ...params,
        });
      }
    );

    it("should open create workflow dialog  when clicking on the relevant action", () => {
      const { wrapper, commitSpy } = doMount();

      wrapper.findComponent(PlusButton).vm.$emit("click");
      expect(commitSpy).toHaveBeenCalledWith(
        "spaces/setCreateWorkflowModalConfig",
        {
          isOpen: true,
          projectId: "someProjectId",
        }
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

      expect(allItems).toMatch("Upload to Hub");
      expect(allItems).toMatch("Create folder");
      expect(allItems).toMatch("Import workflow");
      expect(allItems).toMatch("Create folder");
      expect(allItems).toMatch("Create workflow");
      expect(allItems).toMatch("Create folder");
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

      expect(allItems).toMatch("Download to local space");
      expect(allItems).toMatch("Create folder");
      expect(allItems).toMatch("Create workflow");
      expect(allItems).toMatch("Import workflow");
      expect(allItems).toMatch("Add files");

      expect(items.length).toBe(5);
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
        spaceProvider: {
          connected: false,
        },
      });

      expect(wrapper.findComponent(SubMenu).props("items")).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: "uploadToHub",
            disabled: true,
          }),
        ])
      );
    });

    it("should disable actions that require selected items", () => {
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
        ])
      );
    });

    it.each([
      ["createFolder", "spaces/createFolder", {}],
      ["uploadToHub", "spaces/copyBetweenSpaces", { itemIds: ["934383"] }],
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
      }
    );
  });
});
