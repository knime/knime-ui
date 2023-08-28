import { expect, describe, beforeEach, it, vi } from "vitest";
import { mockVuexStore } from "@/test/utils";
import { mount } from "@vue/test-utils";

import SubMenu from "webapps-common/ui/components/SubMenu.vue";
import { createSpaceProvider } from "@/test/factories";
import { SpaceProviderNS } from "@/api/custom-types";
import * as spacesStore from "@/store/spaces";

import SpaceSelectionDropdown from "../SpaceSelectionDropdown.vue";

const startSpaceProviders: Record<string, SpaceProviderNS.SpaceProvider> = {
  local: createSpaceProvider({
    id: "local",
    connected: true,
    connectionMode: "AUTOMATIC",
    name: "Local Space",
    type: SpaceProviderNS.TypeEnum.LOCAL,
    local: true,
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
    connected: true,
    connectionMode: "AUTOMATIC",
    name: "Hub 1",
    local: false,
    type: SpaceProviderNS.TypeEnum.HUB,
    spaces: [
      {
        id: "hub1space1",
        name: "Space 1 on Hub 1",
        owner: "someUser",
        private: false,
      },
      {
        id: "hub1space2",
        name: "Private space of someUser",
        owner: "someUser",
        private: true,
      },
    ],
  }),
};

describe("SpaceSelectionDropdown.vue", () => {
  const doMount = ({ props = {}, spaceProviders = null } = {}) => {
    const $store = mockVuexStore({
      spaces: {
        ...spacesStore,
        ...{
          state: {
            workflowGroupCache: new WeakMap(),
            projectPath: {
              someProjectId: {
                spaceId: "local",
                spaceProviderId: "local",
                itemId: "root",
              },
            },
            spaceProviders: spaceProviders || startSpaceProviders,
          },
        },
      },
    });

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

  it("offers all connected spaces to switch to", () => {
    const { wrapper } = doMount();
    const menuItems = wrapper.findComponent(SubMenu).props("items");

    // local (no heading for local) + heading for hub1 + 2 spaces on hub1 = 4
    expect(menuItems.length).toBe(4);

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
      }),
    );
  });

  it("switches hub  on click", () => {
    const { wrapper, commitSpy } = doMount();

    const menuItems = wrapper.findComponent(SubMenu).props("items");

    wrapper
      .findComponent(SubMenu)
      .vm.$emit("item-click", null, menuItems.at(3));

    expect(commitSpy).toHaveBeenCalledWith("spaces/setProjectPath", {
      projectId: "someProjectId",
      value: {
        spaceId: "hub1space2",
        spaceProviderId: "hub1",
        itemId: "root",
      },
    });
  });

  it("connects to hub if user clicks 'Sign in'", () => {
    const { wrapper, dispatchSpy } = doMount({
      spaceProviders: {
        local: startSpaceProviders.local,
        hub2: {
          id: "hub2",
          connected: false,
          connectionMode: "AUTHENTICATED",
          name: "Hub 2",
        },
      },
    });

    const menuItems = wrapper.findComponent(SubMenu).props("items");

    expect(menuItems.at(-1).text).toBe("Sign in");

    // click on sign in
    wrapper
      .findComponent(SubMenu)
      .vm.$emit("item-click", null, menuItems.at(-1));

    expect(dispatchSpy).toHaveBeenCalledWith("spaces/connectProvider", {
      spaceProviderId: "hub2",
    });
  });
});
