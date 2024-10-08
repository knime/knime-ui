import type { Store } from "vuex";

import { columnTypes } from "@knime/knime-ui-table";

import type { RootStoreState } from "@/store/types";
import { getIntervalFromSchedule } from "@/util/intervalFromSchedule";
import { formatTime } from "@/util/time";

export const defaultScheduleColumns = [
  "lastRun",
  "nextScheduledExecution",
  "user",
  "schedule",
  "disabled",
  "id",
];

export const scheduleHeaders = {
  lastRun: "Last run",
  nextScheduledExecution: "Next run",
  targetName: "Workflow",
  workflowPath: "Workflow Path",
  user: "User",
  schedule: "Interval",
  inputParameters: "Parameters",
  reset: "Reset",
  discard: "Discard",
  numFailures: "Fail count",
  discardAfterSuccessfulExec: "Discard after success",
  discardAfterFailedExec: "Discard after fail",
  notifications: "Notifications",
  actions: "Actions",
  configurationWithPasswords: "Auth properties",
  lastJob: "Last job ID",
  configuration: "Configuration",
  disabled: "Status",
  id: "Schedule ID",
};

export const scheduleTypes = {
  lastRun: columnTypes.DateTime,
  targetName: columnTypes.Nominal,
  workflowPath: columnTypes.String,
  user: columnTypes.Nominal,
  schedule: columnTypes.Object,
  nextScheduledExecution: columnTypes.DateTime,
  inputParameters: columnTypes.Object,
  numFailures: columnTypes.Number,
  reset: columnTypes.Boolean,
  discard: columnTypes.Boolean,
  discardAfterSuccessfulExec: columnTypes.Boolean,
  discardAfterFailedExec: columnTypes.Boolean,
  notifications: columnTypes.Object,
  actions: columnTypes.Array,
  configurationWithPasswords: columnTypes.Object,
  lastJob: columnTypes.String,
  configuration: columnTypes.Object,
  disabled: columnTypes.Boolean,
  id: columnTypes.String,
};

export const scheduleFormatters = {
  numFailures: (failures: unknown) => (failures ? `${failures} Failures` : "-"),
  schedule: (schedule: unknown) => getIntervalFromSchedule(schedule),
  actions: (actions: unknown[]) =>
    actions?.length ? `${actions.length} Actions` : "-",
  disabled: (disabled: boolean) => (disabled ? "Inactive" : "Active"),
  lastRun: (lastRun: number | undefined) =>
    lastRun ? formatTime(lastRun) : "",
  nextScheduledExecution: (nextScheduledExecution: number) =>
    formatTime(nextScheduledExecution),
};

export const scheduleClassGenerators = {
  workflowPath: ["workflow-path"],
};

export const schedulePopoverRenderers = {
  schedule: true,
  inputParameters: true,
  notifications: true,
  actions: true,
  configurationWithPasswords: true,
  configuration: true,
  disabled: {
    type: "StringRenderer",
    process: (disabled: boolean) => (disabled ? "Active" : "Inactive"),
  },
};

export const slottedColumns = ["status"];

export const scheduleSubMenuItems = [
  {
    name: "edit",
    text: "Edit",
    callback: (
      row: { id: string },
      context: { $store: Store<RootStoreState> },
    ) => {
      context.$store.dispatch("spaces/editSchedule", { scheduleId: row.id });
    },
  },
  {
    name: "delete",
    text: "Delete",
    callback: (
      row: { id: string },
      context: { $store: Store<RootStoreState> },
    ) => {
      context.$store.dispatch("spaces/deleteSchedule", {
        scheduleId: row.id,
      });
    },
  },
];

export const scheduleGroupSubMenuItems = [];
