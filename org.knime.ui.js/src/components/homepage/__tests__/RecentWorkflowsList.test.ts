import { beforeAll, describe, expect, it, vi } from "vitest";
import { VueWrapper, flushPromises, mount } from "@vue/test-utils";

import { FileExplorer } from "@knime/components";

import { API } from "@/api";
import type { RecentWorkflow } from "@/api/custom-types";
import { getToastsProvider } from "@/plugins/toasts";
import * as spacesStore from "@/store/spaces";
import { cachedLocalSpaceProjectId } from "@/store/spaces";
import { createSpaceProvider } from "@/test/factories";
import { deepMocked, mockVuexStore, mockedObject } from "@/test/utils";
import RecentWorkflowsList from "../RecentWorkflowsList.vue";

const routerPush = vi.fn();
vi.mock("vue-router", () => {
  return {
    useRouter: vi.fn(() => ({ push: routerPush })),
  };
});

const mockedAPI = deepMocked(API);

const recentWorkflows: RecentWorkflow[] = [
  {
    name: "Workflow 1",
    origin: { providerId: "provider1", spaceId: "space1", itemId: "item1" },
    timeUsed: new Date("2024-09-01T09:00:00").toISOString(),
  },
  {
    name: "Workflow 2",
    origin: { providerId: "provider2", spaceId: "space1", itemId: "item1" },
    timeUsed: new Date("2024-09-04T09:00:00").toISOString(),
  },
  {
    name: "Workflow 3",
    origin: { providerId: "provider1", spaceId: "space1", itemId: "item1" },
    timeUsed: new Date("2024-09-05T09:00:00").toISOString(),
  },
];

mockedAPI.desktop.updateAndGetMostRecentlyUsedProjects.mockResolvedValue(
  recentWorkflows,
);

const toast = mockedObject(getToastsProvider());

describe("RecentWorkflowsList.vue", () => {
  beforeAll(() => {
    vi.setSystemTime(new Date("2024-09-05T10:00:00"));
  });

  const spaceProvider1 = createSpaceProvider({
    id: "provider1",
    name: "Provider 1",
    connected: true,
  });
  const spaceProvider2 = createSpaceProvider({
    id: "provider2",
    name: "Provider 2",
    connected: true,
  });
  const spaceProvider3 = createSpaceProvider({
    id: "provider3",
    name: "Provider 3",
    connected: false,
  });

  const doMount = () => {
    const $store = mockVuexStore({
      spaces: spacesStore,
    });

    const dispatchSpy = vi.spyOn($store, "dispatch");
    const commitSpy = vi.spyOn($store, "commit");

    const wrapper = mount(RecentWorkflowsList, {
      global: {
        plugins: [$store],
      },
    });

    $store.commit("spaces/setSpaceProviders", {
      [spaceProvider1.id]: spaceProvider1,
      [spaceProvider2.id]: spaceProvider2,
      [spaceProvider3.id]: spaceProvider3,
    });

    return { wrapper, $store, dispatchSpy, commitSpy };
  };

  const findAllByTestId = (wrapper: VueWrapper<any>, id: string) =>
    wrapper.findAll(`[data-test-id="${id}"]`);

  it("should render recent workflows", async () => {
    const { wrapper } = doMount();

    expect(wrapper.find('[data-test-id="no-recent-workflows"]').exists()).toBe(
      true,
    );

    await flushPromises();

    expect(
      mockedAPI.desktop.updateAndGetMostRecentlyUsedProjects,
    ).toHaveBeenCalledOnce();

    // item 1
    expect(
      findAllByTestId(wrapper, "recent-workflow-name").at(0)?.text(),
    ).toMatch("Workflow 1");

    expect(
      findAllByTestId(wrapper, "recent-workflow-provider").at(0)?.text(),
    ).toMatch("Provider 1");

    expect(
      findAllByTestId(wrapper, "recent-workflow-time").at(0)?.text(),
    ).toMatch("4 days ago");

    // item 2
    expect(
      findAllByTestId(wrapper, "recent-workflow-name").at(1)?.text(),
    ).toMatch("Workflow 2");

    expect(
      findAllByTestId(wrapper, "recent-workflow-provider").at(1)?.text(),
    ).toMatch("Provider 2");

    expect(
      findAllByTestId(wrapper, "recent-workflow-time").at(1)?.text(),
    ).toMatch("yesterday");

    // item 3
    expect(
      findAllByTestId(wrapper, "recent-workflow-name").at(2)?.text(),
    ).toMatch("Workflow 3");

    expect(
      findAllByTestId(wrapper, "recent-workflow-provider").at(2)?.text(),
    ).toMatch("Provider 1");

    expect(
      findAllByTestId(wrapper, "recent-workflow-time").at(2)?.text(),
    ).toMatch("1 hour ago");
  });

  it("should display '…' when provider is missing for a recent workflow", async () => {
    const { wrapper, $store } = doMount();

    $store.commit("spaces/setSpaceProviders", {});

    mockedAPI.desktop.updateAndGetMostRecentlyUsedProjects.mockResolvedValueOnce(
      [
        {
          name: "Workflow without provider",
          origin: {
            providerId: "nonExistentProvider",
            spaceId: "space1",
            itemId: "item1",
          },
          timeUsed: new Date("2024-09-05T09:00:00").toISOString(),
        },
      ],
    );

    await flushPromises();

    const providerText = findAllByTestId(wrapper, "recent-workflow-provider")
      .at(0)
      ?.text();
    expect(providerText).toBe("…");
  });

  it("should open recent workflow", async () => {
    const { wrapper, dispatchSpy } = doMount();

    await flushPromises();

    wrapper.findComponent(FileExplorer).vm.$emit("openFile", {
      meta: { recentWorkflow: recentWorkflows.at(1) },
    });

    expect(dispatchSpy).toHaveBeenCalledWith("spaces/openProject", {
      ...recentWorkflows.at(1)?.origin,
      $router: expect.anything(),
    });
  });

  it("should auto login when user tries to open a recent workflow from not connected in space", async () => {
    const notConnectedWorkflow: RecentWorkflow = {
      name: "Workflow 4",
      origin: { providerId: "provider3", spaceId: "space1", itemId: "item1" },
      timeUsed: new Date("2024-09-01T09:00:00").toISOString(),
    };
    const { wrapper, dispatchSpy } = doMount();

    await flushPromises();

    wrapper.findComponent(FileExplorer).vm.$emit("openFile", {
      meta: { recentWorkflow: notConnectedWorkflow },
    });

    expect(dispatchSpy).toHaveBeenCalledWith("spaces/connectProvider", {
      spaceProviderId: notConnectedWorkflow.origin.providerId,
    });
  });

  it("should display provider name and fallback for missing provider", async () => {
    const { wrapper } = doMount();
    await flushPromises();
    expect(
      findAllByTestId(wrapper, "recent-workflow-provider").at(0)?.text(),
    ).toMatch("Provider 1");
  });

  it("should open the create workflow modal and dispatch fetchWorkflowGroupContent on button click", async () => {
    const { wrapper, dispatchSpy, commitSpy } = doMount();

    dispatchSpy.mockImplementationOnce((action) => {
      if (action === "spaces/fetchWorkflowGroupContent") {
        return Promise.resolve();
      }
      return Promise.resolve();
    });

    await flushPromises();

    const createWorkflowButton = wrapper.find(".create-workflow-button");

    expect(createWorkflowButton.exists()).toBe(true);

    await createWorkflowButton.trigger("click");

    expect(dispatchSpy).toHaveBeenCalledWith(
      "spaces/fetchWorkflowGroupContent",
      {
        projectId: cachedLocalSpaceProjectId,
      },
    );

    expect(commitSpy).toHaveBeenCalledWith(
      "spaces/setCreateWorkflowModalConfig",
      {
        isOpen: true,
        projectId: cachedLocalSpaceProjectId,
      },
    );
  });

  it("should handle failure opening recent workflow", async () => {
    const { wrapper, dispatchSpy } = doMount();

    await flushPromises();

    expect(findAllByTestId(wrapper, "recent-workflow-name").length).toBe(3);

    dispatchSpy.mockImplementationOnce(() =>
      Promise.reject(new Error("failure opening recent workflow")),
    );

    wrapper.findComponent(FileExplorer).vm.$emit("openFile", {
      meta: { recentWorkflow: recentWorkflows.at(1) },
    });

    expect(toast.show).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "warning",
        headline: "Could not open workflow",
      }),
    );

    expect(
      mockedAPI.desktop.removeMostRecentlyUsedProject,
    ).toHaveBeenCalledWith({
      spaceProviderId: recentWorkflows.at(1)?.origin.providerId,
      ...recentWorkflows.at(1)?.origin,
    });

    await flushPromises();

    expect(findAllByTestId(wrapper, "recent-workflow-name").length).toBe(2);
  });
});
