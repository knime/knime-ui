import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import { SubMenu } from "@knime/components";

import { SpaceProviderNS } from "@/api/custom-types";
import * as spacesStore from "@/store/spaces";
import {
  createSpace,
  createSpaceGroup,
  createSpaceProvider,
} from "@/test/factories";
import { mockVuexStore } from "@/test/utils";
import SpaceSelectionDropdown from "../SpaceSelectionDropdown.vue";

const startSpaceProviders: Record<string, SpaceProviderNS.SpaceProvider> = {
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
        spaces: [createSpace({ id: "team1space1", name: "Space of Team 1" })],
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
};

describe("SpaceSelectionDropdown.vue", () => {
  type ComponentProps = InstanceType<typeof SpaceSelectionDropdown>["$props"];

  type MountOps = {
    props?: Partial<ComponentProps>;
    spaceProviders?: Record<string, SpaceProviderNS.SpaceProvider> | null;
  };

  const doMount = ({ props = {}, spaceProviders = null }: MountOps = {}) => {
    const $store = mockVuexStore({
      spaces: spacesStore,
    });

    $store.commit("spaces/setProjectPath", {
      projectId: "someProjectId",
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

    const mockRouter = { push: vi.fn() };

    const wrapper = mount(SpaceSelectionDropdown, {
      props: {
        projectId: "someProjectId",
        ...props,
      },
      global: {
        plugins: [$store],
        mocks: { $router: mockRouter },
      },
    });

    return { wrapper, $store, dispatchSpy, commitSpy, $router: mockRouter };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows text of active space on button", () => {
    const { wrapper } = doMount();

    expect(wrapper.find(".selected-text").text()).toBe("Local Space");
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
    expect(menuItems.length).toBe(5);

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
    const { wrapper, commitSpy } = doMount();

    const menuItems = wrapper.findComponent(SubMenu).props("items");

    wrapper
      .findComponent(SubMenu)
      .vm.$emit("item-click", null, menuItems.at(2)!.children!.at(0));

    expect(commitSpy).toHaveBeenCalledWith("spaces/setProjectPath", {
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

    expect(commitSpy).toHaveBeenCalledWith("spaces/setProjectPath", {
      projectId: "someProjectId",
      value: {
        spaceId: "local",
        spaceProviderId: "local",
        itemId: "root",
      },
    });
  });

  it("connects to hub if user clicks 'Sign in'", () => {
    const { wrapper, dispatchSpy } = doMount({
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

    const menuItems = wrapper.findComponent(SubMenu).props("items");

    expect(menuItems.at(-1)!.text).toBe("Sign in");

    // click on sign in
    wrapper
      .findComponent(SubMenu)
      .vm.$emit("item-click", null, menuItems.at(-1));

    expect(dispatchSpy).toHaveBeenCalledWith("spaces/connectProvider", {
      spaceProviderId: "hub2",
    });
  });

  it("renders loading state for a provider that is connecting", async () => {
    const { wrapper, $store } = doMount({
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

    $store.state.spaces.isConnectingToProvider = "hub2";

    await nextTick();

    const menuItems = wrapper.findComponent(SubMenu).props("items");

    expect(menuItems.at(-1)!.text).toMatch("Loading");
  });

  it("renders loading state for a provider that is loading data", async () => {
    const { wrapper, $store } = doMount({
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

    $store.state.spaces.loadingProviderSpacesData.hub2 = true;

    await nextTick();

    const menuItems = wrapper.findComponent(SubMenu).props("items");

    expect(menuItems.at(-1)!.text).toMatch("Loading");
  });
});
