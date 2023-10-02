import { columnTypes } from "@knime/knime-ui-table";
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
  numFailures: (failures) => (failures ? `${failures} Failures` : "-"),
  schedule: (schedule) => getIntervalFromSchedule(schedule),
  actions: (actions) => (actions?.length ? `${actions.length} Actions` : "-"),
  disabled: (disabled) => (disabled ? "Inactive" : "Active"),
  lastRun: (lastRun) => (lastRun ? formatTime(lastRun) : ""),
  nextScheduledExecution: (nextScheduledExecution) =>
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
    process: (disabled) => (disabled ? "Active" : "Inactive"),
  },
};

export const slottedColumns = ["status"];

export const scheduleSubMenuItems = [
  {
    name: "edit",
    text: "Edit",
    callback: (row, context) => {
      context.$store.dispatch("spaces/editSchedule", { scheduleId: row.id });
    },
  },
  {
    name: "delete",
    text: "Delete",
    callback: (row, context) => {
      context.$store.dispatch("spaces/deleteSchedule", {
        scheduleId: row.id,
      });
    },
  },
];

export const scheduleGroupSubMenuItems = [];
