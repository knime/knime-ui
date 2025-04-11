import { merge } from "lodash-es";

import type { Job, Schedule } from "@/api/custom-types";
import type { DeepPartial } from "../utils";

export const createJob = (data: DeepPartial<Job> = {}): Job => {
  const job: Job = {
    id: "1",
    owner: "Username",
    createdAt: new Date().getTime(),
    state: "EXECUTION_FINISHED",
    name: "Workflow 1",
    createdVia: "WebPortal",
    discard: false,
    discardAfterFailedExec: false,
    discardAfterSuccessfulExec: false,
    finishedExecutionAt: 1693229280.004036,
    hasReport: false,
    isOutdated: false,
    isSwapped: false,
    schedulerId: "scheduler:1",
    startedExecutionAt: 1693229280.004036,
    workflow: "Workflow",
    nodeMessages: [],
  };

  return merge(job, data);
};

export const createSchedule = (data: DeepPartial<Schedule> = {}): Schedule => {
  const schedule: Schedule = {
    id: "1",
    targetName: "Workflow",
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
          1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,

          21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
        ],
      },
    },
    discard: false,
    discardAfterFailedExec: false,
    discardAfterSuccessfulExec: false,
    executionRetries: 0,
    lastJob: "job:1",
    numFailures: 0,
    reset: false,
    workflowPath: "/WorkflowFolder/Workflow",
  };

  return merge(schedule, data);
};
