import { beforeAll, describe, expect, it, vi } from "vitest";
import { VueWrapper, flushPromises, mount } from "@vue/test-utils";
import { API } from "@api";
import { createTestingPinia } from "@pinia/testing";

import { FileExplorer } from "@knime/components";

import type { RecentWorkflow } from "@/api/custom-types";
import { getToastsProvider } from "@/plugins/toasts";
import { useSpaceAuthStore } from "@/store/spaces/auth";
import { cachedLocalSpaceProjectId } from "@/store/spaces/common";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";
import { useSpacesStore } from "@/store/spaces/spaces";
import { createSpaceProvider } from "@/test/factories";
import { deepMocked, mockedObject } from "@/test/utils";
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

mockedAPI.desktop.getMostRecentlyUsedProjects.mockResolvedValue(
  recentWorkflows,
);

const toast = mockedObject(getToastsProvider());

describe("RecentWorkflowsList.vue", () => {
  beforeAll(() => {
    vi.setSystemTime(new Date("2024-09-05T10:00:00"));
    vi.clearAllMocks();
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
    const wrapper = mount(RecentWorkflowsList, {
      global: {
        plugins: [
          createTestingPinia({
            stubActions: false,
            createSpy: vi.fn,
          }),
        ],
      },
    });

    useSpaceProvidersStore().setSpaceProviders({
      [spaceProvider1.id]: spaceProvider1,
      [spaceProvider2.id]: spaceProvider2,
      [spaceProvider3.id]: spaceProvider3,
    });

    return { wrapper };
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
      mockedAPI.desktop.getMostRecentlyUsedProjects,
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
    const { wrapper } = doMount();

    useSpaceProvidersStore().setSpaceProviders({});

    mockedAPI.desktop.getMostRecentlyUsedProjects.mockResolvedValueOnce(
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
    const { wrapper } = doMount();

    await flushPromises();

    wrapper.findComponent(FileExplorer).vm.$emit("openFile", {
      meta: { recentWorkflow: recentWorkflows.at(1) },
    });

    expect(useSpaceOperationsStore().openProject).toHaveBeenCalledWith({
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
    const { wrapper } = doMount();

    await flushPromises();

    wrapper.findComponent(FileExplorer).vm.$emit("openFile", {
      meta: { recentWorkflow: notConnectedWorkflow },
    });

    expect(useSpaceAuthStore().connectProvider).toHaveBeenCalledWith({
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
    const { wrapper } = doMount();
    const spaceOperationsStore = useSpaceOperationsStore();

    vi.mocked(
      spaceOperationsStore.fetchWorkflowGroupContent,
    ).mockResolvedValueOnce([]);

    await flushPromises();

    const createWorkflowButton = wrapper.find(".create-workflow-button");

    expect(createWorkflowButton.exists()).toBe(true);

    await createWorkflowButton.trigger("click");

    expect(spaceOperationsStore.fetchWorkflowGroupContent).toHaveBeenCalledWith(
      {
        projectId: cachedLocalSpaceProjectId,
      },
    );

    expect(useSpacesStore().setCreateWorkflowModalConfig).toHaveBeenCalledWith({
      isOpen: true,
      projectId: cachedLocalSpaceProjectId,
    });
  });

  it("should handle failure opening recent workflow", async () => {
    const { wrapper } = doMount();

    await flushPromises();

    expect(findAllByTestId(wrapper, "recent-workflow-name").length).toBe(3);

    vi.mocked(useSpaceOperationsStore().openProject).mockImplementation(() =>
      Promise.reject(new Error("failure opening recent workflow")),
    );

    wrapper.findComponent(FileExplorer).vm.$emit("openFile", {
      meta: { recentWorkflow: recentWorkflows.at(1) },
    });
    await flushPromises();

    expect(toast.show).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "warning",
        headline: "Could not open workflow",
      }),
    );
  });
});
