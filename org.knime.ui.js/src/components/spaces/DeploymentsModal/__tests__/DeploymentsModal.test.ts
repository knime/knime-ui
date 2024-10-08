import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";

import { Modal } from "@knime/components";

import { API } from "@/api";
import * as spacesStore from "@/store/spaces";
import { createJob, createSchedule } from "@/test/factories";
import { deepMocked, mockVuexStore } from "@/test/utils";
import DeploymentsModal from "../DeploymentsModal.vue";

const mockedAPI = deepMocked(API);

describe("DeploymentsModal.vue", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const MOCK_JOBS = [
    createJob({
      id: "1",
      createdAt: 1693229280.004036,
      name: "Workflow 1",
    }),
    createJob({
      id: "2",
      createdAt: 1692875153.637449,
      name: "Workflow 2",
    }),
  ];
  const MOCK_SCHEDULES = [
    createSchedule({
      id: "1",
      lastRun: 1693230480.002202,
    }),
  ];
  const doMount = ({
    isOpen = true,
    jobs = MOCK_JOBS,
    schedules = MOCK_SCHEDULES,
    name = "Workflow",
  } = {}) => {
    mockedAPI.space.listJobsForWorkflow.mockResolvedValue({ jobs });
    mockedAPI.space.listSchedulesForWorkflow.mockResolvedValue({ schedules });

    const $store = mockVuexStore({
      spaces: spacesStore,
    });

    $store.commit("spaces/setDeploymentsModalConfig", {
      isOpen,
      name,
    });

    const dispatchSpy = vi.spyOn($store, "dispatch");
    const commitSpy = vi.spyOn($store, "commit");

    const wrapper = mount(DeploymentsModal, {
      global: {
        plugins: [$store],
        stubs: { BaseModal: true },
      },
      attachTo: document.body,
    });

    return { wrapper, $store, dispatchSpy, commitSpy };
  };

  it("opens a deployments modal", async () => {
    const { wrapper, $store } = doMount({ isOpen: false, name: null });

    expect(wrapper.findComponent(Modal).isVisible()).toBe(false);

    $store.commit("spaces/setDeploymentsModalConfig", {
      isOpen: true,
      name: "Schedules and jobs of Workflow",
    });
    await nextTick();

    expect(wrapper.findComponent(Modal).isVisible()).toBe(true);
  });

  it("closes a deployments modal", async () => {
    const { wrapper, commitSpy } = doMount();

    wrapper.findComponent(Modal).trigger("cancel");
    await nextTick();

    expect(wrapper.findComponent(Modal).isVisible()).toBe(false);
    expect(commitSpy).toHaveBeenCalledWith("spaces/setDeploymentsModalConfig", {
      isOpen: false,
      name: null,
      projectId: null,
      itemId: null,
    });
  });

  it("displays correct title", () => {
    const workflowName = "Workflow Name";
    const { wrapper } = doMount({ name: workflowName });

    expect(wrapper.find(".header").find("h2").text()).toBe(
      `Schedules and jobs of “${"Workflow Name"}”`,
    );
  });

  it("displays a message if there are no jobs or schedules", () => {
    const { wrapper } = doMount({ jobs: [], schedules: [] });

    expect(wrapper.find(".no-data").text()).toBe(
      "There are no schedules or jobs to display.",
    );
  });
});
