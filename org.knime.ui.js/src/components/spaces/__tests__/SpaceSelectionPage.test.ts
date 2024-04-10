import { expect, describe, beforeEach, it, vi } from "vitest";
import { nextTick } from "vue";

import { deepMocked, mockVuexStore } from "@/test/utils";
import { mount } from "@vue/test-utils";

import * as spacesStore from "@/store/spaces";

import { API } from "@api";
import { SpaceProviderNS } from "@/api/custom-types";
import { APP_ROUTES } from "@/router/appRoutes";
import { createSpaceProvider } from "@/test/factories";
import {
  cachedLocalSpaceProjectId,
  globalSpaceBrowserProjectId,
} from "@/store/spaces";

import * as $colors from "@/style/colors.mjs";
import SpaceSelectionPage from "../SpaceSelectionPage.vue";
import SpaceCard from "../SpaceCard.vue";

const mockSpaceProviders: Record<string, SpaceProviderNS.SpaceProvider> = {
  local: createSpaceProvider(),
};

const mockedAPI = deepMocked(API);

describe("SpaceSelectionPage.vue", () => {
  const doMount = async ({
    mockProvidersResponse = mockSpaceProviders,
  } = {}) => {
    mockedAPI.space.listWorkflowGroup.mockResolvedValue({});

    const $store = mockVuexStore({
      spaces: spacesStore,
    });

    await $store.dispatch("spaces/loadLocalSpace");

    $store.commit("spaces/setProjectPath", {
      projectId: globalSpaceBrowserProjectId,
      value: {
        spaceId: "local",
        spaceProviderId: "local",
        itemId: "someItem",
      },
    });

    mockedAPI.desktop.getSpaceProviders.mockImplementation(() => {
      $store.dispatch("spaces/setAllSpaceProviders", mockProvidersResponse);
    });

    const dispatchSpy = vi.spyOn($store, "dispatch");
    const commitSpy = vi.spyOn($store, "commit");

    const mockRouter = { push: vi.fn() };

    const wrapper = mount(SpaceSelectionPage, {
      global: {
        plugins: [$store],
        mocks: { $router: mockRouter, $colors },
      },
    });

    return { wrapper, $store, dispatchSpy, commitSpy, $router: mockRouter };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch space providers on created", async () => {
    const { dispatchSpy } = await doMount();

    expect(dispatchSpy).toHaveBeenCalledWith("spaces/refreshSpaceProviders");
  });

  it("should redirect to browsing page if it was previously open", async () => {
    const { $router } = await doMount();

    expect($router.push).toHaveBeenCalledWith({
      name: APP_ROUTES.SpaceBrowsingPage,
    });
  });

  it("should create New workflow on local space", async () => {
    const { wrapper, dispatchSpy, commitSpy } = await doMount();

    await new Promise((r) => setTimeout(r, 0));
    await wrapper.find(".create-workflow-local").trigger("click");
    await new Promise((r) => setTimeout(r, 0));
    expect(dispatchSpy).toHaveBeenCalledWith(
      "spaces/fetchWorkflowGroupContent",
      { projectId: cachedLocalSpaceProjectId },
    );
    expect(commitSpy).toHaveBeenCalledWith(
      "spaces/setCreateWorkflowModalConfig",
      { isOpen: true, projectId: cachedLocalSpaceProjectId },
    );
  });

  it("should render all space providers", async () => {
    const { wrapper } = await doMount();

    await new Promise((r) => setTimeout(r, 0));

    expect(wrapper.findAll(".space-provider").length).toBe(1);
  });

  it("should render the loading skeletons", async () => {
    const { wrapper, $store } = await doMount();

    await new Promise((r) => setTimeout(r, 0));

    expect(wrapper.find(".skeletons").exists()).toBe(false);

    $store.commit("spaces/setIsLoadingProvider", true);

    await nextTick();

    expect(wrapper.find(".skeletons").exists()).toBe(true);
    expect(wrapper.findAll(".space-provider").length).toBe(1);
  });

  it("should handle login for spaces that require authentication", async () => {
    const { wrapper, dispatchSpy } = await doMount({
      mockProvidersResponse: {
        hub1: createSpaceProvider({
          id: "hub1",
          connected: false,
          connectionMode: "AUTHENTICATED",
          name: "Hub 1",
          type: SpaceProviderNS.TypeEnum.HUB,
        }),
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
    const { wrapper } = await doMount({
      mockProvidersResponse: {
        hub1: createSpaceProvider({
          id: "My-KNIME-Hub",
          connected: false,
          connectionMode: "AUTHENTICATED",
          name: "My-KNIME-Hub (https://api.hub.knime.com)",
          local: false,
          type: SpaceProviderNS.TypeEnum.HUB,
          spaces: null,
        }),
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
    const { wrapper } = await doMount({
      mockProvidersResponse: {
        hub1: createSpaceProvider({
          id: "My-KNIME-Hub",
          connected: false,
          user: {
            name: "testUser",
          },
          connectionMode: "AUTHENTICATED",
          name: "My-KNIME-Hub (https://api.hub.knime.com)",
          type: SpaceProviderNS.TypeEnum.HUB,
        }),
      },
    });

    await new Promise((r) => setTimeout(r, 0));

    const linkToProvider = wrapper
      .find(".space-provider-name a")
      .attributes("href");
    expect(linkToProvider).toBe("https://hub.knime.com/testUser");
  });

  it("should handle logout for spaces that require authentication", async () => {
    const { wrapper, dispatchSpy } = await doMount({
      mockProvidersResponse: {
        hub1: createSpaceProvider({
          id: "hub1",
          connected: true,
          connectionMode: "AUTHENTICATED",
          name: "Hub 1",
          type: SpaceProviderNS.TypeEnum.HUB,
        }),
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
    const { wrapper, $store, $router } = await doMount({
      mockProvidersResponse: {
        hub1: createSpaceProvider({
          id: "hub1",
          connected: true,
          connectionMode: "AUTHENTICATED",
          name: "Hub 1",
          type: SpaceProviderNS.TypeEnum.HUB,
        }),
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

    const { spaceProviderId, spaceId } =
      $store.state.spaces.projectPath[globalSpaceBrowserProjectId];

    expect(spaceProviderId).toBe("hub1");
    expect(spaceId).toEqual(dummySpace.id);

    await new Promise((r) => setTimeout(r, 0));
    expect($router.push).toHaveBeenCalledWith({
      name: APP_ROUTES.SpaceBrowsingPage,
    });
  });
});
