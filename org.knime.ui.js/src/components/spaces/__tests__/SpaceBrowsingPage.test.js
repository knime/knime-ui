import { expect, describe, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { mockVuexStore, deepMocked } from "@/test/utils";

import ArrowLeftIcon from "webapps-common/ui/assets/img/icons/arrow-left.svg";
import { APP_ROUTES } from "@/router/appRoutes";
import PageHeader from "@/components/common/PageHeader.vue";
import * as spacesStore from "@/store/spaces";
import * as applicationStore from "@/store/application";

import SpaceExplorer from "../SpaceExplorer.vue";
import SpaceExplorerActions from "../SpaceExplorerActions.vue";
import SpaceBrowsingPage from "../SpaceBrowsingPage.vue";
import { globalSpaceBrowserProjectId } from "@/store/spaces";

import { API } from "@api";
const mockedAPI = deepMocked(API);
mockedAPI.desktop.importWorkflows.mockResolvedValue([]);
mockedAPI.desktop.importFiles.mockResolvedValue([]);

vi.mock("webapps-common/ui/services/toast");
vi.mock("vue-router", () => ({
  useRouter: vi.fn(() => ({ push: () => {} })),
  useRoute: vi.fn(() => ({ name: APP_ROUTES.WorkflowPage })),
}));

describe("SpaceBrowsingPage", () => {
  const doMount = ({ initialStoreState = {} } = {}) => {
    const $store = mockVuexStore({
      spaces: spacesStore,
      application: applicationStore,
    });

    const commitSpy = vi.spyOn($store, "commit");
    const dispatchSpy = vi
      .spyOn($store, "dispatch")
      .mockImplementation(() => {});

    const $router = {
      push: vi.fn(),
    };

    $store.state.spaces = {
      ...$store.state.spaces,
      ...{
        projectPath: {
          [globalSpaceBrowserProjectId]: {
            spaceId: "local",
            spaceProviderId: "local",
            itemId: "root",
          },
        },
      },
      ...initialStoreState,
    };

    const wrapper = mount(SpaceBrowsingPage, {
      global: {
        plugins: [$store],
        mocks: { $router, $shortcuts: { get: vi.fn(() => ({})) } },
      },
    });

    return { wrapper, $store, $router, commitSpy, dispatchSpy };
  };

  it("renders the components", () => {
    const { wrapper } = doMount();

    expect(wrapper.findComponent(PageHeader).exists()).toBe(true);
    expect(wrapper.findComponent(SpaceExplorer).exists()).toBe(true);
    expect(wrapper.findComponent(ArrowLeftIcon).exists()).toBe(true);
    expect(wrapper.findComponent(SpaceExplorerActions).exists()).toBe(true);
  });

  it("renders correct information for local space", async () => {
    const { wrapper, $store } = doMount();
    $store.commit("spaces/setSpaceProviders", {
      local: {
        spaceProviderId: "local",
        spaceId: "local",
        itemId: "root",
        type: "LOCAL",
      },
    });

    await nextTick();

    const subtitle = wrapper.find(".subtitle").text();
    const title = wrapper.find(".title").text();
    expect(subtitle).toBe("Local space");
    expect(title).toBe("Your local space");
  });

  it("renders correct information for private space", () => {
    const { wrapper } = doMount({
      initialStoreState: {
        projectPath: {
          [globalSpaceBrowserProjectId]: {
            spaceId: "randomhub",
            spaceProviderId: "hub1",
            itemId: "root",
          },
        },
        spaceProviders: {
          hub1: {
            spaces: [
              {
                id: "randomhub",
                name: "My private space",
                private: true,
              },
            ],
          },
        },
      },
    });

    const subtitle = wrapper.find(".subtitle").text();
    const title = wrapper.find(".title").text();
    expect(subtitle).toBe("Private space");
    expect(title).toBe("My private space");
  });

  it("renders correct information for public space", () => {
    const { wrapper } = doMount({
      initialStoreState: {
        projectPath: {
          [globalSpaceBrowserProjectId]: {
            spaceId: "randomhub2",
            spaceProviderId: "hub1",
            itemId: "root",
          },
        },
        spaceProviders: {
          hub1: {
            spaces: [
              {
                id: "randomhub2",
                name: "My public space",
                private: false,
              },
            ],
          },
        },
      },
    });

    const subtitle = wrapper.find(".subtitle").text();
    const title = wrapper.find(".title").text();
    expect(subtitle).toBe("Public space");
    expect(title).toBe("My public space");
  });

  it("routes back to space selection page when back button is clicked and clears state", async () => {
    const { wrapper, $router, commitSpy } = doMount();
    await wrapper.findComponent(ArrowLeftIcon).vm.$emit("click");

    expect(commitSpy).toHaveBeenCalledWith(
      "spaces/removeProjectPath",
      globalSpaceBrowserProjectId,
    );

    expect($router.push).toHaveBeenCalledWith({
      name: APP_ROUTES.EntryPage.GetStartedPage,
    });
  });

  it("should handle the import workflow action", () => {
    const { wrapper, dispatchSpy } = doMount();

    const workflowButton = wrapper.find("#importWorkflow");
    workflowButton.trigger("click");
    expect(dispatchSpy).toHaveBeenCalledWith("spaces/importToWorkflowGroup", {
      projectId: globalSpaceBrowserProjectId,
      importType: "WORKFLOW",
    });
  });

  it("should handle the add files action", () => {
    const { wrapper, dispatchSpy } = doMount();

    const workflowButton = wrapper.find("#importFiles");
    workflowButton.trigger("click");
    expect(dispatchSpy).toHaveBeenCalledWith("spaces/importToWorkflowGroup", {
      projectId: globalSpaceBrowserProjectId,
      importType: "FILES",
    });
  });

  it("should handle the create folder action", () => {
    const { wrapper, commitSpy } = doMount();

    wrapper.find(".create-workflow-btn button").trigger("click");
    expect(commitSpy).toHaveBeenCalledWith(
      "spaces/setCreateWorkflowModalConfig",
      {
        isOpen: true,
        projectId: globalSpaceBrowserProjectId,
      },
    );
  });

  it("should handle the upload to hub action", async () => {
    const { wrapper, dispatchSpy, $store } = doMount();
    $store.commit("spaces/setSpaceProviders", {
      local: {
        spaceProviderId: "local",
        spaceId: "local",
        itemId: "root",
        type: "LOCAL",
      },
      // add any hub so that upload is possible
      hub1: { connected: true, type: "HUB" },
    });

    await nextTick();

    wrapper
      .findComponent(SpaceExplorer)
      .vm.$emit("update:selectedItemIds", ["1", "2"]);

    await wrapper.vm.$nextTick();

    wrapper.find("#upload").trigger("click");
    expect(dispatchSpy).toHaveBeenCalledWith("spaces/copyBetweenSpaces", {
      projectId: globalSpaceBrowserProjectId,
      itemIds: ["1", "2"],
    });
  });

  it("should handle the download to local space action", async () => {
    const { wrapper, dispatchSpy } = doMount({
      initialStoreState: {
        projectPath: {
          [globalSpaceBrowserProjectId]: {
            spaceId: "randomhub2",
            spaceProviderId: "hub1",
            itemId: "root",
          },
        },
        spaceProviders: {
          hub1: {
            spaces: [
              {
                id: "randomhub2",
                name: "My public space",
                private: false,
              },
            ],
          },
        },
      },
    });
    await wrapper.vm.$nextTick();

    wrapper
      .findComponent(SpaceExplorer)
      .vm.$emit("update:selectedItemIds", ["1", "2"]);

    await wrapper.vm.$nextTick();

    wrapper.find("#downloadToLocalSpace").trigger("click");
    expect(dispatchSpy).toHaveBeenCalledWith("spaces/copyBetweenSpaces", {
      projectId: globalSpaceBrowserProjectId,
      itemIds: ["1", "2"],
    });
  });

  it("should handle `currentSelectedItemIds`", async () => {
    const { wrapper, $store } = doMount();

    expect(
      wrapper.findComponent(SpaceExplorer).props("selectedItemIds"),
    ).toEqual([]);

    $store.commit("spaces/setCurrentSelectedItemIds", ["1"]);
    await nextTick();

    expect(
      wrapper.findComponent(SpaceExplorer).props("selectedItemIds"),
    ).toEqual(["1"]);

    wrapper
      .findComponent(SpaceExplorer)
      .vm.$emit("update:selectedItemIds", ["2"]);

    await nextTick();
    expect($store.state.spaces.currentSelectedItemIds).toEqual(["2"]);

    wrapper.unmount();
    expect($store.state.spaces.currentSelectedItemIds).toEqual([]);
  });
});
