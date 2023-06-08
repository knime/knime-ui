import { expect, describe, beforeEach, it, vi } from "vitest";
import { deepMocked, mockVuexStore } from "@/test/utils";
import { mount } from "@vue/test-utils";

import * as spacesStore from "@/store/spaces";

import { API } from "@api";
import { APP_ROUTES } from "@/router/appRoutes";
import SpaceSelectionPage from "../SpaceSelectionPage.vue";
import SpaceCard from "../SpaceCard.vue";
import type { SpaceProvider, SpaceUser } from "@/api/custom-types";

const mockSpaceProviders: Record<
  string,
  SpaceProvider & Partial<{ user: SpaceUser }>
> = {
  local: {
    id: "local",
    connected: true,
    connectionMode: "AUTOMATIC",
    name: "Local Space",
  },
};

const mockedAPI = deepMocked(API);

describe("SpaceSelectionPage.vue", () => {
  const doMount = ({
    mockProvidersResponse = mockSpaceProviders,
    spacesStoreOverrides = null,
  } = {}) => {
    mockedAPI.desktop.fetchAllSpaceProviders.mockResolvedValue(
      mockProvidersResponse
    );
    mockedAPI.space.listWorkflowGroup.mockResolvedValue({});

    const $store = mockVuexStore({
      spaces: spacesStoreOverrides || spacesStore,
    });

    const dispatchSpy = vi.spyOn($store, "dispatch");
    const commitSpy = vi.spyOn($store, "commit");

    const mockRouter = { push: vi.fn() };

    const wrapper = mount(SpaceSelectionPage, {
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

  it("should fetch space providers on created", () => {
    const { dispatchSpy } = doMount();

    expect(dispatchSpy).toHaveBeenCalledWith("spaces/fetchAllSpaceProviders");
  });

  it("should redirect to browsing page if it was previously open", () => {
    const { $router } = doMount({
      spacesStoreOverrides: {
        state: {
          spaceBrowser: {
            spaceId: "local",
            spaceProviderId: "local",
            itemId: "someItem",
          },
        },
        actions: {
          fetchAllSpaceProviders: vi.fn(),
          fetchWorkflowGroupContent: vi.fn(),
        },
      },
    });

    expect($router.push).toHaveBeenCalledWith({
      name: APP_ROUTES.SpaceBrowsingPage,
    });
  });

  it("should create New workflow on local space", async () => {
    const { wrapper, dispatchSpy, commitSpy } = doMount();

    await new Promise((r) => setTimeout(r, 0));
    await wrapper.find(".create-workflow-local").trigger("click");
    await new Promise((r) => setTimeout(r, 0));
    expect(commitSpy).toHaveBeenCalledWith("spaces/setActiveSpaceId", "local");
    expect(dispatchSpy).toHaveBeenCalledWith(
      "spaces/fetchWorkflowGroupContent",
      { itemId: "root" }
    );
    expect(commitSpy).toHaveBeenCalledWith(
      "spaces/setIsCreateWorkflowModalOpen",
      true
    );
  });

  it("should render all space providers", async () => {
    const { wrapper } = doMount();

    await new Promise((r) => setTimeout(r, 0));

    expect(wrapper.findAll(".space-provider").length).toBe(1);
  });

  it("should handle login for spaces that require authentication", async () => {
    const { wrapper, dispatchSpy } = doMount({
      mockProvidersResponse: {
        hub1: {
          id: "hub1",
          connected: false,
          connectionMode: "AUTHENTICATED",
          name: "Hub 1",
        },
      },
    });

    await new Promise((r) => setTimeout(r, 0));

    const signInButton = wrapper.find(".sign-in");
    expect(signInButton.exists()).toBe(true);

    signInButton.trigger("click");
    expect(dispatchSpy).toHaveBeenCalledWith("spaces/connectProvider", {
      spaceProviderId: "hub1",
    });
  });

  it("should display more information on special knime community hub", async () => {
    const { wrapper } = doMount({
      mockProvidersResponse: {
        hub1: {
          id: "My-KNIME-Hub",
          connected: false,
          connectionMode: "AUTHENTICATED",
          name: "My-KNIME-Hub (https://api.hub.knime.com)",
        },
      },
    });

    await new Promise((r) => setTimeout(r, 0));

    const linkToProvider = wrapper
      .find(".space-provider-name a")
      .attributes("href");
    expect(linkToProvider).toBe("https://hub.knime.com");

    const providerName = wrapper.find(".space-provider-name");
    expect(providerName.text()).toContain("KNIME Community Hub");
    expect(providerName.text()).toContain("(hub.knime.com)");
    expect(providerName.text()).not.toContain("My-KNIME-Hub");
    expect(wrapper.find(".community-hub-text").exists()).toBe(true);
  });

  it("should links to hub profile for community hub", async () => {
    const { wrapper } = doMount({
      mockProvidersResponse: {
        hub1: {
          id: "My-KNIME-Hub",
          connected: false,
          user: {
            name: "testUser",
          },
          connectionMode: "AUTHENTICATED",
          name: "My-KNIME-Hub (https://api.hub.knime.com)",
        },
      },
    });

    await new Promise((r) => setTimeout(r, 0));

    const linkToProvider = wrapper
      .find(".space-provider-name a")
      .attributes("href");
    expect(linkToProvider).toBe("https://hub.knime.com/testUser");
  });

  it("should handle logout for spaces that require authentication", async () => {
    const { wrapper, dispatchSpy } = doMount({
      mockProvidersResponse: {
        hub1: {
          id: "hub1",
          connected: true,
          connectionMode: "AUTHENTICATED",
          name: "Hub 1",
        },
      },
    });

    await new Promise((r) => setTimeout(r, 0));

    const signInButton = wrapper.find(".logout");
    expect(signInButton.exists()).toBe(true);

    signInButton.trigger("click");
    expect(dispatchSpy).toHaveBeenCalledWith("spaces/disconnectProvider", {
      spaceProviderId: "hub1",
    });
  });

  it("should navigate to space browsing page", async () => {
    const { wrapper, $store, $router } = doMount({
      mockProvidersResponse: {
        hub1: {
          id: "hub1",
          connected: true,
          connectionMode: "AUTHENTICATED",
          name: "Hub 1",
        },
      },
    });

    await new Promise((r) => setTimeout(r, 0));

    const dummySpace = {
      id: "dummy-id",
      name: "Dummy Space",
      private: true,
      description: "",
    };

    $store.commit("spaces/setSpaceProviders", {
      ...$store.state.spaces.spaceProviders,
      hub1: {
        ...$store.state.spaces.spaceProviders.hub1,
        spaces: [dummySpace],
      },
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(wrapper.findComponent(SpaceCard).exists()).toBe(true);

    wrapper.findComponent(SpaceCard).vm.$emit("click", dummySpace);

    expect($store.state.spaces.activeSpaceProvider.id).toBe("hub1");
    expect($store.state.spaces.activeSpace.spaceId).toEqual(dummySpace.id);

    // remember current state
    expect($store.state.spaces.spaceBrowser.spaceId).toEqual(dummySpace.id);
    expect($store.state.spaces.spaceBrowser.spaceProviderId).toBe("hub1");

    await new Promise((r) => setTimeout(r, 0));
    expect($router.push).toHaveBeenCalledWith({
      name: APP_ROUTES.SpaceBrowsingPage,
    });
  });
});
