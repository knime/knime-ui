import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import { MenuItems } from "@knime/components";

import { SpaceProviderNS } from "@/api/custom-types";
import { isBrowser, isDesktop } from "@/environment";
import {
  createSpace,
  createSpaceGroup,
  createSpaceProvider,
} from "@/test/factories";
import { mockEnvironment } from "@/test/utils/mockEnvironment";
import { mockStores } from "@/test/utils/mockStores";
import SpaceExplorerContextMenu from "../SpaceExplorerContextMenu.vue";

const startSpaceProviders: Record<string, SpaceProviderNS.SpaceProvider> = {
  local: createSpaceProvider({
    id: "local",
    connected: true,
    connectionMode: "AUTOMATIC",
    name: "Local Space",
    type: SpaceProviderNS.TypeEnum.LOCAL,
    spaceGroups: [
      createSpaceGroup({
        spaces: [
          {
            id: "local",
            name: "Local Space",
            owner: "local",
            private: false,
          },
        ],
      }),
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
    spaceGroups: [
      createSpaceGroup({
        spaces: [createSpace({ id: "serverSpace1" })],
      }),
    ],
  }),
};

vi.mock("@/environment");

describe("SpaceExplorerContextMenu.vue", () => {
  beforeAll(() => {
    mockEnvironment("DESKTOP", { isBrowser, isDesktop });
  });

  type ComponentProps = InstanceType<typeof SpaceExplorerContextMenu>["$props"];
  const doMount = ({
    props = {},
    spaceProviders,
  }: {
    props?: Partial<ComponentProps>;
    spaceProviders?: Record<string, SpaceProviderNS.SpaceProvider>;
  } = {}) => {
    const mockedStores = mockStores();

    const projectId = "someProjectId";

    mockedStores.spaceCachingStore.setProjectPath({
      projectId,
      value: {
        spaceId: "local",
        spaceProviderId: "local",
        itemId: "root",
      },
    });

    mockedStores.spaceProvidersStore.setSpaceProviders(
      spaceProviders || startSpaceProviders,
    );

    const wrapper = mount(SpaceExplorerContextMenu, {
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
          // @ts-ignore Partial mock
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
        plugins: [mockedStores.testingPinia],
      },
    });

    return { wrapper, mockedStores };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all items", () => {
    const { wrapper } = doMount();

    expect(wrapper.findComponent(MenuItems).exists()).toBe(true);
    const items = wrapper.findComponent(MenuItems).props("items");
    expect(items.length).toBe(7);
    expect(items.map((item) => item.text)).toStrictEqual([
      "rename",
      "delete",
      "Duplicate",
      "Export",
      "Move to...",
      "Copy to...",
      "Upload",
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
    expect(items.map((item) => item.text)).to.not.include("rename");
  });

  it("displays the 'Copy to...' option when items are selected", async () => {
    const { wrapper, mockedStores } = doMount({
      props: {
        selectedItemIds: ["2342"],
        isMultipleSelectionActive: false,
        projectId: "someHubProjectId",
      },
      spaceProviders: {
        hub1: {
          ...startSpaceProviders.hub1,
          connected: true,
          type: SpaceProviderNS.TypeEnum.HUB,
          id: "hub1",
        },
      },
    });
    mockedStores.spaceCachingStore.setProjectPath({
      projectId: "someHubProjectId",
      value: {
        spaceId: "someHubSpace",
        spaceProviderId: "hub1",
        itemId: "root",
      },
    });

    await flushPromises();

    const items = wrapper.findComponent(MenuItems).props("items");
    expect(items.some((item) => item.text === "Copy to...")).toBe(true);
  });

  it("calls copy to space action on store when 'Copy to...' is clicked", async () => {
    const closeContextMenu = vi.fn();
    const { wrapper, mockedStores } = doMount({
      props: {
        selectedItemIds: ["2342"],
        isMultipleSelectionActive: false,
        projectId: "someHubProjectId",
        closeContextMenu,
      },
      spaceProviders: {
        hub1: {
          ...startSpaceProviders.hub1,
          connected: true,
          type: SpaceProviderNS.TypeEnum.HUB,
          id: "hub1",
        },
      },
    });
    mockedStores.spaceCachingStore.setProjectPath({
      projectId: "someHubProjectId",
      value: {
        spaceId: "someHubSpace",
        spaceProviderId: "hub1",
        itemId: "root",
      },
    });

    await flushPromises();

    const menuItems = wrapper.findComponent(MenuItems);
    const items = menuItems.props("items");

    const copyToSpace = items.find((item) => item.text === "Copy to...");
    expect(copyToSpace).toBeDefined();

    menuItems.vm.$emit("item-click", null, copyToSpace);
    await nextTick();

    expect(mockedStores.spacesStore.moveOrCopyToSpace).toHaveBeenCalledWith({
      itemIds: ["2342"],
      projectId: "someHubProjectId",
      isCopy: true,
    });
    expect(closeContextMenu).toHaveBeenCalled();
  });

  it("calls upload to hub action on store if clicked", async () => {
    const closeContextMenu = vi.fn();
    const { wrapper, mockedStores } = doMount({
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
    const uploadToHub = items.find((item) => item.id === "upload");
    menuItems.vm.$emit("item-click", null, uploadToHub);
    await nextTick();

    expect(mockedStores.spacesStore.copyBetweenSpaces).toHaveBeenCalledWith({
      itemIds: ["2342", "3432"],
      projectId: "someProjectId",
    });
    expect(closeContextMenu).toHaveBeenCalled();
  });

  describe("options for browser environment", () => {
    beforeAll(() => {
      mockEnvironment("BROWSER", { isBrowser, isDesktop });
    });

    it("hides 'Download to local space' and 'Open in Browser' if isBrowser = true", () => {
      const { wrapper } = doMount();
      const menuItems = wrapper.findComponent(MenuItems).props("items");
      const texts = menuItems.map((item) => item.text);
      expect(texts).not.toContain("Download to local space");
      expect(texts).not.toContain("Open in Browser");
    });

    it("hides 'Create Workflow' if isBrowser = true", () => {
      const { wrapper } = doMount();
      const menuItems = wrapper.findComponent(MenuItems).props("items");
      const texts = menuItems.map((item) => item.text);
      expect(texts).not.toContain("Create new workflow");
    });
  });
});
