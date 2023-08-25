/* eslint-disable no-nested-ternary */
import { columnTypes } from "@knime/knime-ui-table";
import { caseFormatter } from "webapps-common/util/capitalize";

// Supported wizardExecutionStates.
export const wizardExecutionStates = {
  LOADING: "LOADING",
  EXECUTING: "EXECUTING",
  INTERACTION_REQUIRED: "INTERACTION_REQUIRED",
  FINISHED: "EXECUTION_FINISHED",
  FINISHED_WITH_ERRORS: "EXECUTION_FAILED_WITH_CONTENT",
  FAILED: "EXECUTION_FAILED",
  NOT_EXECUTABLE: "NOT_EXECUTABLE",
  CANCELLED: "EXECUTION_CANCELLED",
  STOPPING: "STOPPING_EXECUTION", // used for error handling; frontend only
  MISSING: "MISSING_JOB", // used for error handling; frontend only
};

// Job states mapped to their job list status.
export const jobStates = {
  [wizardExecutionStates.LOADING]: "Loading",
  CONFIGURED: "Interaction required",
  [wizardExecutionStates.EXECUTING]: "Running",
  EXECUTED: "Interaction required", // deprecated in favor of INTERACTION_REQUIRED or FINISHED
  [wizardExecutionStates.FINISHED]: "Success",
  [wizardExecutionStates.FINISHED_WITH_ERRORS]: "Success",
  [wizardExecutionStates.FAILED]: "Failed",
  [wizardExecutionStates.CANCELLED]: "Failed",
  [wizardExecutionStates.INTERACTION_REQUIRED]: "Interaction required",
  RUNNING: "Interaction required",
  IDLE: "Failed", // something happened to the underlying workflow which left it in an un-configured state.
  DISCARDED: "Failed",
  UNDEFINED: "Failed",
  LOAD_ERROR: "Failed",
  VANISHED: "Failed",
  NOT_EXECUTABLE: "Not executable",
  // eslint-disable-next-line no-undefined
  [undefined]: "Interaction required", // fallback job state
};

export const defaultColumns = [
  "createdAt",
  "creatorName",
  "state",
  "nodeMessages",
];

export const defaultSortColumn = 0; // createdAt

export const defaultSortDirection = -1; // descending

export const jobHeaders = {
  createdAt: "Created at",
  id: "Job ID",
  discardAfterSuccessfulExec: "Discard after success",
  discardAfterFailedExec: "Discard after fail",
  actions: "Actions",
  configuration: "Configuration",
  createdVia: "Created by",
  creatorName: "Owner",
  state: "State",
  nodeMessages: "Node messages",
  isOutdated: "Is outdated",
  startedExecutionAt: "Started at",
  notifications: "Notifications",
  finishedExecutionAt: "Finished at",
  workflow: "Workflow",
  isSwapped: "Swapped",
  hasReport: "Has report",
  name: "Name",
  properties: "Properties",
};

export const jobTypes = {
  createdAt: columnTypes.DateTime,
  id: columnTypes.String,
  discardAfterSuccessfulExec: columnTypes.Boolean,
  discardAfterFailedExec: columnTypes.Boolean,
  actions: columnTypes.Array,
  configuration: columnTypes.Object,
  createdVia: columnTypes.Nominal,
  creatorName: columnTypes.String,
  state: columnTypes.Nominal,
  nodeMessages: columnTypes.Array,
  isOutdated: columnTypes.Boolean,
  startedExecutionAt: columnTypes.DateTime,
  notifications: columnTypes.Object,
  finishedExecutionAt: columnTypes.DateTime,
  workflow: columnTypes.Nominal,
  isSwapped: columnTypes.Boolean,
  hasReport: columnTypes.Boolean,
  name: columnTypes.String,
  properties: columnTypes.Object,
};

export const createdViaConfig = {
  "generic client": "Generic client",
  schedule: "Schedule",
  webportal: "WebPortal",
  "rest api": "REST API",
  [null]: "-",
  [undefined]: "-", // eslint-disable-line no-undefined
};

const booleanMap = {
  [true]: "Yes",
  [false]: "No",
  [undefined]: "-", // eslint-disable-line no-undefined
};

export const jobFormatters = () => ({
  actions: (actions) => (actions?.length ? `${actions.length} Actions` : "-"),
  createdVia: (createdVia) => createdViaConfig[createdVia?.toLowerCase()],
  state: (state) => caseFormatter({ string: state, format: "snakeFormat" }),
  nodeMessages: (messages) =>
    messages?.length ? `${messages.length} Messages` : "-",
  discardAfterSuccessfulExec: (bool) => booleanMap[bool],
  discardAfterFailedExec: (bool) => booleanMap[bool],
  isSwapped: (bool) => booleanMap[bool],
  hasReport: (bool) => booleanMap[bool],
});

export const jobClassGenerators = {
  state: [
    "state",
    (state) => {
      console.log("jobStates", jobStates);
      console.log("state", state);
      return state.toLowerCase().replace(" ", "-");
      //   return jobStates[state].toLowerCase().replace(" ", "-");
    },
  ],
  workflow: ["workflow-path"],
};

export const popoverRenderers = {
  actions: true,
  configuration: true,
  nodeMessages: {
    type: "MessageRenderer",
    process: (data) =>
      data?.map((item) => ({
        type: item.messageType,
        item: item.node,
        message: item.message,
        itemTitle: "Node",
        messageTitle: "Message",
      })),
  },
  notifications: true,
  properties: true,
};

export const slottedColumns = [];

export const jobSubMenuItems = [
  {
    name: "open",
    text: "Open",
    callback: async (row, context) => {
      consola.trace("Open job submenu action.");
      context.$store.dispatch("notification/show", {
        message: "Execution opened in new tab.",
        type: "success",
        showCollapser: false,
        autoRemove: false,
        details: {
          text: "If it does not open automatically, ",
          link: {
            text: "click here.",
            href: await context.$api.forwardToExecutionApp({ jobId: row.id }),
            newTab: true,
          },
        },
      });
    },
  },
  {
    name: "delete",
    text: "Delete",
    callback: (row, context) => {
      consola.trace("Discard job submenu action.");
      context.$store.dispatch("deployments/deleteJob", { jobId: row.id });
    },
  },
];
