import { expect, describe, it, vi, afterEach } from "vitest";
import * as Vue from "vue";
import { mount } from "@vue/test-utils";
import { deepMocked, mockVuexStore } from "@/test/utils";

import Modal from "webapps-common/ui/components/Modal.vue";
import CirclePlayIcon from "webapps-common/ui/assets/img/icons/circle-play.svg";

import { API } from "@api";
import * as spacesStore from "@/store/spaces";
import DeploymentsModal from "../DeploymentsModal.vue";

const mockedAPI = deepMocked(API);

describe("DeploymentsModal.vue", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const MOCK_JOBS = [
    {
      id: "1",
      owner: "Username",
      createdAt: 1693229280.004036,
      state: "EXECUTION_FINISHED",
      name: "Workflow 1",
    },
    {
      id: "2",
      owner: "Username",
      createdAt: 1692875153.637449,
      state: "EXECUTION_FINISHED",
      name: "Workflow 2",
    },
  ];
  const MOCK_SCHEDULES = [
    {
      id: "1",
      name: "Workflow",
      lastRun: 1693230480.002202,
      user: "Username",
      schedule: {
        startTime: 1693228680,
        nextScheduledExecution: 1693404180,
        disabled: true,
        skipIfPreviousJobStillRunning: false,
        delay: 5,
        delayType: "MINUTES",
        filter: {
          times: [
            {
              start: [0, 0],
              end: [23, 59, 59],
            },
          ],
          daysOfWeek: [
            "TUESDAY",
            "THURSDAY",
            "SUNDAY",
            "SATURDAY",
            "FRIDAY",
            "MONDAY",
            "WEDNESDAY",
          ],
          months: [
            "JANUARY",
            "DECEMBER",
            "JUNE",
            "APRIL",
            "NOVEMBER",
            "JULY",
            "FEBRUARY",
            "SEPTEMBER",
            "OCTOBER",
            "MARCH",
            "MAY",
            "AUGUST",
          ],
          days: [
            1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
            20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
          ],
        },
      },
    },
  ];
  const doMount = ({
    isOpen = true,
    jobs = MOCK_JOBS,
    schedules = MOCK_SCHEDULES,
    name = "Workflow",
  } = {}) => {
    mockedAPI.space.listJobsForWorkflow.mockResolvedValue({ jobs });
    mockedAPI.space.listSchedulesForWorkflow.mockResolvedValue({ schedules });
    // const defaultProps = {
    //   items: MOCK_DATA,
    //   isRootFolder: true,
    //   mode: "normal",
    //   itemIconRenderer,
    //   activeRenamedItemId: "",
    // };
    const $store = mockVuexStore({
      spaces: spacesStore,
    });

    $store.commit("spaces/setDisplayDeploymentsModal", {
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
    });

    return { wrapper, $store, dispatchSpy, commitSpy };
  };

  it("opens a deployments modal", async () => {
    const { wrapper, $store } = doMount({ isOpen: false, name: null });

    expect(wrapper.findComponent(CirclePlayIcon).isVisible()).toBe(false);
    expect(wrapper.findComponent(Modal).isVisible()).toBe(false);

    await $store.commit("spaces/setDisplayDeploymentsModal", {
      isOpen: true,
      name: "Schedules and jobs of Workflow",
    });
    await Vue.nextTick();

    expect(wrapper.findComponent(CirclePlayIcon).isVisible()).toBe(true);
    expect(wrapper.findComponent(Modal).isVisible()).toBe(true);
  });

  it("closes a deployments modal", async () => {
    const { wrapper, commitSpy } = doMount();

    wrapper.findComponent(Modal).vm.$emit("cancel");
    await Vue.nextTick();

    expect(wrapper.findComponent(CirclePlayIcon).isVisible()).toBe(false);
    expect(wrapper.findComponent(Modal).isVisible()).toBe(false);
    expect(commitSpy).toHaveBeenCalledWith(
      "spaces/setDisplayDeploymentsModal",
      { isOpen: false, name: null },
    );
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
