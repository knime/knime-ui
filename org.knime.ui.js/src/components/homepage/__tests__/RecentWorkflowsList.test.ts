import { VueWrapper, flushPromises, mount } from "@vue/test-utils";
import { beforeAll, describe, expect, it, vi } from "vitest";

import FileExplorer from "webapps-common/ui/components/FileExplorer/FileExplorer.vue";
import { deepMocked, mockVuexStore, mockedObject } from "@/test/utils";
import { API } from "@api";
import * as spacesStore from "@/store/spaces";
import type { RecentWorkflow } from "@/api/custom-types";
import { createSpaceProvider } from "@/test/factories";
import { getToastsProvider } from "@/plugins/toasts";
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
  });
  const spaceProvider2 = createSpaceProvider({
    id: "provider2",
    name: "Provider 2",
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

    return { wrapper, $store, dispatchSpy };
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
