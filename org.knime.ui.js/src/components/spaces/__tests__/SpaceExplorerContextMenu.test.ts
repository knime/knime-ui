import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import { MenuItems } from "@knime/components";

import { SpaceProviderNS } from "@/api/custom-types";
import * as spacesStore from "@/store/spaces";
import { createSpace, createSpaceProvider } from "@/test/factories";
import { mockVuexStore } from "@/test/utils";
import SpaceSelectionContextMenu from "../SpaceExplorerContextMenu.vue";

const startSpaceProviders: Record<string, SpaceProviderNS.SpaceProvider> = {
  local: createSpaceProvider({
    id: "local",
    connected: true,
    connectionMode: "AUTOMATIC",
    name: "Local Space",
    type: SpaceProviderNS.TypeEnum.LOCAL,
    spaces: [
      {
        id: "local",
        name: "Local Space",
        owner: "local",
        private: false,
      },
    ],
  }),
  hub1: createSpaceProvider({
    id: "hub1",
    connected: false,
    connectionMode: "AUTOMATIC",
    name: "Hub 1",
    type: SpaceProviderNS.TypeEnum.HUB,
  }),
  server1: createSpaceProvider({
    id: "server1",
    connected: false,
    connectionMode: "AUTOMATIC",
    name: "Server 1",
    type: SpaceProviderNS.TypeEnum.SERVER,
    spaces: [createSpace({ id: "serverSpace1" })],
  }),
};

describe("SpaceSelectionContextMenu.vue", () => {
  const doMount = ({ props = {}, spaceProviders = null } = {}) => {
    const $store = mockVuexStore({
      spaces: spacesStore,
    });

    const projectId = "someProjectId";

    $store.commit("spaces/setProjectPath", {
      projectId,
      value: {
        spaceId: "local",
        spaceProviderId: "local",
        itemId: "root",
      },
    });

    $store.commit(
      "spaces/setSpaceProviders",
      spaceProviders || startSpaceProviders,
    );

    const dispatchSpy = vi.spyOn($store, "dispatch");
    const commitSpy = vi.spyOn($store, "commit");

    const wrapper = mount(SpaceSelectionContextMenu, {
      props: {
        projectId,
        selectedItemIds: ["2342"],
        isMultipleSelectionActive: false,
        createRenameOption: vi
          .fn()
          .mockReturnValue({ id: "rename", text: "rename" }),
        createDeleteOption: vi
          .fn()
          .mockReturnValue({ id: "delete", text: "delete" }),
        createDuplicateOption: vi
          .fn()
          .mockReturnValue({ id: "duplicate", text: "duplicate" }),
        anchor: {
          item: {
            name: "item-name",
            isOpen: false,
            meta: {
              type: "workflows",
            },
          },
          index: 0,
          element: document.createElement("div"),
        },
        closeContextMenu: vi.fn(),
        onItemClick: vi.fn(),
        ...props,
      },
      global: {
        plugins: [$store],
      },
    });

    return { wrapper, $store, dispatchSpy, commitSpy };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all items", () => {
    const { wrapper } = doMount();

    expect(wrapper.findComponent(MenuItems).exists()).toBe(true);
    const items = wrapper.findComponent(MenuItems).props("items");
    expect(items.length).toBe(6);
    expect(items.map((item) => item.text)).toStrictEqual([
      "rename",
      "delete",
      "Duplicate",
      "Export",
      "Upload",
      "Connect to",
    ]);
  });

  it("hides rename item if multiple items are selected", () => {
    const { wrapper } = doMount({
      props: {
        selectedItemIds: ["2342", "3432"],
        isMultipleSelectionActive: true,
      },
    });

    const items = wrapper.findComponent(MenuItems).props("items");
    expect(items.map((item) => item.text)).toStrictEqual([
      "delete",
      "Duplicate",
      "Export",
      "Upload",
      "Connect to",
    ]);
  });

  it("hides connect to hub if there is nothing to connect to", async () => {
    const { wrapper } = doMount({
      props: {
        selectedItemIds: ["2342", "3432"],
        isMultipleSelectionActive: true,
      },
      spaceProviders: {
        local: createSpaceProvider(),
        hub1: createSpaceProvider({
          id: "hub1",
          connected: true,
          connectionMode: "AUTHENTICATED",
          name: "Hub 1",
          type: SpaceProviderNS.TypeEnum.HUB,
        }),
      },
    });
    await nextTick();

    const items = wrapper.findComponent(MenuItems).props("items");
    expect(items.map((item) => item.text)).toStrictEqual([
      "delete",
      "Duplicate",
      "Export",
      "Upload",
    ]);
  });

  it("displays the 'Copy to...' option when items are selected", () => {
    const { wrapper } = doMount({
      props: {
        selectedItemIds: ["2342"],
        isMultipleSelectionActive: false,
      },
      spaceProviders: {
        hub1: {
          ...startSpaceProviders.hub1,
          connected: true,
          type: SpaceProviderNS.TypeEnum.HUB,
        },
      },
    });

    const items = wrapper.findComponent(MenuItems).props("items");
    expect(items.some((item) => item.text === "Copy to...")).toBe(true);
  });

  it("calls copy to space action on store when 'Copy to...' is clicked", async () => {
    const closeContextMenu = vi.fn();
    const { wrapper, dispatchSpy } = doMount({
      props: {
        selectedItemIds: ["2342"],
        isMultipleSelectionActive: false,
        closeContextMenu,
      },
      spaceProviders: {
        hub1: {
          ...startSpaceProviders.hub1,
          connected: true,
          type: SpaceProviderNS.TypeEnum.HUB,
        },
      },
    });

    const menuItems = wrapper.findComponent(MenuItems);
    const items = menuItems.props("items");

    const copyToSpace = items.find((item) => item.text === "Copy to...");
    expect(copyToSpace).toBeDefined();

    menuItems.vm.$emit("item-click", null, copyToSpace);
    await nextTick();

    expect(dispatchSpy).toHaveBeenCalledWith("spaces/moveOrCopyToSpace", {
      itemIds: ["2342"],
      projectId: "someProjectId",
      isCopy: true,
    });
    expect(closeContextMenu).toHaveBeenCalled();
  });

  it("disables upload to hub if no space provider is connected", () => {
    const { wrapper } = doMount({
      props: {
        selectedItemIds: ["2342", "3432"],
        isMultipleSelectionActive: true,
      },
      spaceProviders: {
        local: startSpaceProviders.local,
        hub1: { ...startSpaceProviders.hub1, connected: false },
      },
    });

    const items = wrapper.findComponent(MenuItems).props("items");
    expect(items[3]).toStrictEqual(
      expect.objectContaining({
        disabled: true,
        text: "Upload",
      }),
    );
  });

  it("enables upload to hub if some space provider is connected", () => {
    const { wrapper } = doMount({
      props: {
        selectedItemIds: ["2342", "3432"],
        isMultipleSelectionActive: true,
      },
      spaceProviders: {
        local: startSpaceProviders.local,
        hub1: { ...startSpaceProviders.hub1, connected: true },
      },
    });

    const items = wrapper.findComponent(MenuItems).props("items");
    expect(items[3]).toStrictEqual(
      expect.objectContaining({
        disabled: false,
        text: "Upload",
      }),
    );
  });

  it("shows submenu to connect to", () => {
    const { wrapper } = doMount({
      props: {
        selectedItemIds: ["2342", "3432"],
        isMultipleSelectionActive: true,
      },
      spaceProviders: {
        local: startSpaceProviders.local,
        hub1: { ...startSpaceProviders.hub1, connected: false },
        hub2: createSpaceProvider({
          name: "Hub 2",
          id: "hub2",
          connectionMode: "AUTOMATIC",
          connected: false,
          local: false,
          type: SpaceProviderNS.TypeEnum.HUB,
        }),
      },
    });

    const items = wrapper.findComponent(MenuItems).props("items");
    expect(items[4]).toStrictEqual(
      expect.objectContaining({
        text: "Connect to",
        execute: null,
        children: expect.arrayContaining([
          expect.objectContaining({ text: startSpaceProviders.hub1.name }),
          expect.objectContaining({ text: "Hub 2" }),
        ]),
      }),
    );
  });

  it("connects to provider via submenu", async () => {
    const closeContextMenu = vi.fn();
    const { wrapper, dispatchSpy } = doMount({
      props: {
        selectedItemIds: ["2342", "3432"],
        isMultipleSelectionActive: true,
        closeContextMenu,
      },
      spaceProviders: {
        local: startSpaceProviders.local,
        hub1: { ...startSpaceProviders.hub1, connected: false },
        hub2: {
          name: "Hub 2",
          id: "hub2",
          connectionMode: "AUTOMATIC",
          connected: false,
          spaces: [],
        },
      },
    });

    const menuItems = wrapper.findComponent(MenuItems);
    const items = menuItems.props("items");
    const connectToHubItem = items[4].children[0];
    menuItems.vm.$emit("item-click", null, connectToHubItem);
    await nextTick();

    expect(dispatchSpy).toHaveBeenCalledWith("spaces/connectProvider", {
      spaceProviderId: "hub1",
    });
    expect(closeContextMenu).toHaveBeenCalled();
  });

  it("calls upload to hub action on store if clicked", async () => {
    const closeContextMenu = vi.fn();
    const { wrapper, dispatchSpy } = doMount({
      props: {
        selectedItemIds: ["2342", "3432"],
        isMultipleSelectionActive: true,
        closeContextMenu,
      },
      spaceProviders: {
        local: startSpaceProviders.local,
        hub1: { ...startSpaceProviders.hub1, connected: true },
      },
    });

    const menuItems = wrapper.findComponent(MenuItems);
    const items = menuItems.props("items");
    const uploadToHub = items[3];
    menuItems.vm.$emit("item-click", null, uploadToHub);
    await nextTick();

    expect(dispatchSpy).toHaveBeenCalledWith("spaces/copyBetweenSpaces", {
      itemIds: ["2342", "3432"],
      projectId: "someProjectId",
    });
    expect(closeContextMenu).toHaveBeenCalled();
  });

  it("calls connect to hub action on store if clicked", async () => {
    const closeContextMenu = vi.fn();
    const { wrapper, dispatchSpy } = doMount({
      props: {
        selectedItemIds: ["2342", "3432"],
        isMultipleSelectionActive: true,
        closeContextMenu,
      },
      spaceProviders: {
        local: startSpaceProviders.local,
        hub1: { ...startSpaceProviders.hub1, connected: false },
      },
    });

    const menuItems = wrapper.findComponent(MenuItems);
    const items = menuItems.props("items");
    const connectToHub = items[4];
    menuItems.vm.$emit("item-click", null, connectToHub);
    await nextTick();

    expect(dispatchSpy).toHaveBeenCalledWith("spaces/connectProvider", {
      spaceProviderId: "hub1",
    });
    expect(closeContextMenu).toHaveBeenCalled();
  });
});
