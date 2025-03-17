import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { API } from "@api";

import { SubMenu } from "@knime/components";

import { SpaceProviderNS } from "@/api/custom-types";
import { knimeExternalUrls } from "@/plugins/knimeExternalUrls";
import {
  createSpace,
  createSpaceGroup,
  createSpaceProvider,
} from "@/test/factories";
import { deepMocked } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";
import SpaceSelectionDropdown from "../SpaceSelectionDropdown.vue";

const mockedAPI = deepMocked(API);

const startSpaceProviders: Record<
  "local" | "hub1" | "server",
  SpaceProviderNS.SpaceProvider
> = {
  local: createSpaceProvider({
    id: "local",
    connected: true,
    connectionMode: "AUTOMATIC",
    name: "Local Space",
    type: SpaceProviderNS.TypeEnum.LOCAL,
    spaceGroups: [
      createSpaceGroup({
        id: "local",
        spaces: [
          createSpace({
            id: "local",
            name: "Local Space",
            owner: "local",
            private: false,
          }),
        ],
      }),
    ],
  }),
  hub1: createSpaceProvider({
    id: "hub1",
    connected: true,
    connectionMode: "AUTOMATIC",
    name: "Hub 1",
    type: SpaceProviderNS.TypeEnum.HUB,
    spaceGroups: [
      createSpaceGroup({
        id: "team1",
        name: "Team 1",
        type: SpaceProviderNS.UserTypeEnum.TEAM,
        spaces: [
          createSpace({
            id: "team1space1",
            owner: "j.doe",
            name: "Space of Team 1",
          }),
        ],
      }),
      createSpaceGroup({
        id: "jdoe",
        name: "John Doe",
        type: SpaceProviderNS.UserTypeEnum.USER,
        spaces: [
          {
            id: "hub1space1",
            name: "Space 1 on Hub 1 from John Doe",
            owner: "jdoe",
            private: false,
          },
          {
            id: "hub1space2",
            name: "Private space of someUser shared with John",
            owner: "someUser",
            private: true,
          },
        ],
      }),
    ],
  }),
  server: createSpaceProvider({
    id: "server",
    connected: true,
    connectionMode: "AUTOMATIC",
    name: "Server",
    type: SpaceProviderNS.TypeEnum.SERVER,
    spaceGroups: [
      createSpaceGroup({
        id: "server-group",
        name: "server-group",
        type: SpaceProviderNS.UserTypeEnum.USER,
        spaces: [createSpace({ id: "server-space", name: "Server space" })],
      }),
    ],
  }),
};

describe("SpaceSelectionDropdown.vue", () => {
  type ComponentProps = InstanceType<typeof SpaceSelectionDropdown>["$props"];

  type MountOps = {
    props?: Partial<ComponentProps>;
    spaceProviders?: Record<string, SpaceProviderNS.SpaceProvider> | null;
  };

  const doMount = ({ props = {}, spaceProviders = null }: MountOps = {}) => {
    const mockedStores = mockStores();

    mockedStores.spaceCachingStore.setProjectPath({
      projectId: "someProjectId",
      value: {
        spaceId: "local",
        spaceProviderId: "local",
        itemId: "root",
      },
    });

    mockedStores.spaceProvidersStore.setSpaceProviders(
      spaceProviders || startSpaceProviders,
    );

    const mockRouter = { push: vi.fn() };

    const wrapper = mount(SpaceSelectionDropdown, {
      props: {
        projectId: "someProjectId",
        ...props,
      },
      global: {
        plugins: [mockedStores.testingPinia],
        mocks: { $router: mockRouter },
      },
    });

    return { wrapper, mockedStores, $router: mockRouter };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows text of active space on button", async () => {
    const { wrapper, mockedStores } = doMount();

    mockedStores.spaceCachingStore.setProjectPath({
      projectId: "localProject",
      value: {
        spaceProviderId: startSpaceProviders.local.id,
        spaceId: startSpaceProviders.local.spaceGroups.at(0)!.spaces.at(0)!.id,
        itemId: "root",
      },
    });
    mockedStores.spaceCachingStore.setProjectPath({
      projectId: "hubProjectGroup1Space1",
      value: {
        spaceProviderId: startSpaceProviders.hub1.id,
        spaceId: startSpaceProviders.hub1.spaceGroups.at(0)!.spaces.at(0)!.id,
        itemId: "root",
      },
    });
    mockedStores.spaceCachingStore.setProjectPath({
      projectId: "hubProjectGroup2Space2",
      value: {
        spaceProviderId: startSpaceProviders.hub1.id,
        spaceId: startSpaceProviders.hub1.spaceGroups.at(1)!.spaces.at(1)!.id,
        itemId: "root",
      },
    });
    mockedStores.spaceCachingStore.setProjectPath({
      projectId: "serverProject",
      value: {
        spaceProviderId: startSpaceProviders.server.id,
        spaceId: startSpaceProviders.server.spaceGroups.at(0)!.spaces.at(0)!.id,
        itemId: "root",
      },
    });

    await wrapper.setProps({ projectId: "localProject" });
    expect(wrapper.find(".selected-text").text()).toBe("Local Space");

    await wrapper.setProps({ projectId: "hubProjectGroup1Space1" });
    expect(wrapper.find(".selected-text").text()).toBe(
      "j.doe – Space of Team 1",
    );

    await wrapper.setProps({ projectId: "hubProjectGroup2Space2" });
    expect(wrapper.find(".selected-text").text()).toBe(
      "someUser – Private space of someUser shared with John",
    );

    await wrapper.setProps({ projectId: "serverProject" });
    expect(wrapper.find(".selected-text").text()).toBe("Server");
  });

  it("hides text if showText is false", () => {
    const { wrapper } = doMount({ props: { showText: false } });

    expect(wrapper.find(".selected-text").exists()).toBe(false);
  });

  it("renders connected spaces to switch to grouped by owner", () => {
    const { wrapper } = doMount();
    const menuItems = wrapper.findComponent(SubMenu).props("items");

    // local (no heading for local)
    // + heading for hub1
    // + team group
    // + user group
    // + user group
    // + server group
    expect(menuItems.length).toBe(6);

    expect(menuItems[0]).toStrictEqual(
      expect.objectContaining({
        text: "Local Space",
        selected: true,
      }),
    );
    expect(menuItems[1]).toStrictEqual(
      expect.objectContaining({
        text: "Hub 1",
        sectionHeadline: true,
        separator: true,
      }),
    );

    // team group
    expect(menuItems[2]).toStrictEqual(
      expect.objectContaining({
        text: "Team 1",
        children: expect.any(Array),
      }),
    );

    // user group 1
    expect(menuItems[3]).toStrictEqual(
      expect.objectContaining({
        text: "jdoe",
        children: expect.any(Array),
      }),
    );

    // user group 1
    expect(menuItems[4]).toStrictEqual(
      expect.objectContaining({
        text: "someUser",
        children: expect.any(Array),
      }),
    );

    // children of team group
    expect(menuItems[2].children).toStrictEqual([
      expect.objectContaining({
        text: "Space of Team 1",
      }),
    ]);

    // children of user group 1
    expect(menuItems[3].children).toStrictEqual([
      expect.objectContaining({
        text: "Space 1 on Hub 1 from John Doe",
      }),
    ]);

    // children of user group 1
    expect(menuItems[4].children).toStrictEqual([
      expect.objectContaining({
        text: "Private space of someUser shared with John",
      }),
    ]);
  });

  it("switches space on click", () => {
    const { wrapper, mockedStores } = doMount();

    const menuItems = wrapper.findComponent(SubMenu).props("items");

    wrapper
      .findComponent(SubMenu)
      .vm.$emit("item-click", null, menuItems.at(2)!.children!.at(0));

    expect(mockedStores.spaceCachingStore.setProjectPath).toHaveBeenCalledWith({
      projectId: "someProjectId",
      value: {
        spaceId: "team1space1",
        spaceProviderId: "hub1",
        itemId: "root",
      },
    });

    wrapper
      .findComponent(SubMenu)
      .vm.$emit("item-click", null, menuItems.at(0));

    expect(mockedStores.spaceCachingStore.setProjectPath).toHaveBeenCalledWith({
      projectId: "someProjectId",
      value: {
        spaceId: "local",
        spaceProviderId: "local",
        itemId: "root",
      },
    });
  });

  it("connects to hub if user clicks 'Sign in'", async () => {
    const hub2 = createSpaceProvider({
      id: "hub2",
      connected: false,
      connectionMode: "AUTHENTICATED",
      name: "Hub 2",
      type: SpaceProviderNS.TypeEnum.HUB,
      spaceGroups: Object.create([]),
    });

    const { wrapper, mockedStores } = doMount({
      spaceProviders: {
        local: startSpaceProviders.local,
        hub2,
      },
    });
    mockedStores.spaceProvidersStore.loadingProviderSpacesData.hub2 = false;
    await nextTick();

    const connectedHub = { ...hub2, connected: true };
    mockedAPI.desktop.connectSpaceProvider.mockResolvedValueOnce(connectedHub);

    const spacesAfterLogin = [
      createSpaceGroup({
        name: "group1",
        spaces: [createSpace({ name: "space1" })],
      }),
    ];
    vi.mocked(
      mockedStores.spaceProvidersStore.fetchProviderSpaces,
    ).mockResolvedValueOnce(spacesAfterLogin);

    const menuItems = wrapper.findComponent(SubMenu).props("items");

    expect(menuItems.at(-1)!.text).toBe("Sign in");

    expect(wrapper.find(".selected-text").text()).toMatch("Local Space");
    // click on sign in
    wrapper
      .findComponent(SubMenu)
      .vm.$emit("item-click", null, menuItems.at(-1));

    await flushPromises();
    expect(mockedStores.spaceAuthStore.connectProvider).toHaveBeenCalledWith({
      spaceProviderId: "hub2",
    });

    expect(wrapper.find(".selected-text").text()).toMatch("j.doe – space1");
  });

  it("renders loading state for a provider that is connecting", async () => {
    const { wrapper, mockedStores } = doMount({
      spaceProviders: {
        local: startSpaceProviders.local,
        hub2: createSpaceProvider({
          id: "hub2",
          connected: false,
          connectionMode: "AUTHENTICATED",
          name: "Hub 2",
        }),
      },
    });

    mockedStores.spaceProvidersStore.isConnectingToProvider = "hub2";

    await nextTick();

    const menuItems = wrapper.findComponent(SubMenu).props("items");

    expect(menuItems.at(-1)!.text).toMatch("Loading");
  });

  it("renders loading state for a provider that is loading data", async () => {
    const { wrapper, mockedStores } = doMount({
      spaceProviders: {
        local: startSpaceProviders.local,
        hub2: createSpaceProvider({
          id: "hub2",
          connected: true,
          connectionMode: "AUTHENTICATED",
          name: "Hub 2",
        }),
      },
    });

    mockedStores.spaceProvidersStore.loadingProviderSpacesData.hub2 = true;

    await nextTick();

    const menuItems = wrapper.findComponent(SubMenu).props("items");

    expect(menuItems.map(({ text }) => text)).toEqual([
      "Local Space",
      "Loading…",
    ]);
  });

  it("handles external link clicks", async () => {
    const originalWindowOpen = window.open;
    window.open = vi.fn();

    const { wrapper } = doMount({
      spaceProviders: {
        local: startSpaceProviders.local,
        hub1: createSpaceProvider({
          id: "hub1",
          connected: true,
          connectionMode: "AUTOMATIC",
          name: "Hub 1",
          type: SpaceProviderNS.TypeEnum.HUB,
          spaceGroups: [
            createSpaceGroup({
              id: "jdoe",
              name: "John Doe",
              type: SpaceProviderNS.UserTypeEnum.USER,
              spaces: [
                {
                  id: "hub1space1",
                  name: "Space 1 on Hub 1 from John Doe",
                  owner: "jdoe",
                  private: false,
                },
              ],
            }),
          ],
        }),
      },
    });

    const menuItems = wrapper.findComponent(SubMenu).props("items");
    const externalLinkItem = {
      text: "External Link",
      metadata: {
        type: "external-link",
        url: knimeExternalUrls.TEAM_PLAN_URL,
      },
    };

    menuItems.push(externalLinkItem);

    await nextTick();

    wrapper
      .findComponent(SubMenu)
      .vm.$emit("item-click", null, externalLinkItem);

    expect(window.open).toHaveBeenCalledWith(
      knimeExternalUrls.TEAM_PLAN_URL,
      "_blank",
    );

    window.open = originalWindowOpen;
  });
});
