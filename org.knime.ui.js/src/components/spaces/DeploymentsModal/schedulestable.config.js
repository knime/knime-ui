/* eslint-disable no-nested-ternary */
import { columnTypes } from "@knime/knime-ui-table";

export const defaultColumns = ["startTime", "user", "state", "nodeMessages"];

export const defaultSortColumn = 0; // createdAt

export const defaultSortDirection = -1; // descending

export const jobHeaders = {
  startTime: "Created at",
  id: "Schedule ID",
  actions: "Actions",
  configuration: "Configuration",
  user: "Owner",
  state: "State",
  nodeMessages: "Node messages",
  notifications: "Notifications",
  targetName: "Workflow",
  schedule: "Schedule",
  lastJob: "Last job",
  discardAfterFailedExec: "Discard after failed execution",
  discardAfterSuccessfulExec: "Discard after Successful Execution",
};

export const jobTypes = {
  startTime: columnTypes.DateTime,
  id: columnTypes.String,
  discardAfterSuccessfulExec: columnTypes.Boolean,
  discardAfterFailedExec: columnTypes.Boolean,
  actions: columnTypes.Array,
  configuration: columnTypes.Object,
  user: columnTypes.String,
  state: columnTypes.Nominal,
  nodeMessages: columnTypes.Array,
  notifications: columnTypes.Object,
  targetName: columnTypes.String,
  schedules: columnTypes.Object,
  lastJob: columnTypes.String,
};

// export const createdViaConfig = {
//   "generic client": "Generic client",
//   schedule: "Schedule",
//   webportal: "WebPortal",
//   "rest api": "REST API",
//   [null]: "-",
//   [undefined]: "-", // eslint-disable-line no-undefined
// };

const booleanMap = {
  [true]: "Yes",
  [false]: "No",
  [undefined]: "-", // eslint-disable-line no-undefined
};

export const jobFormatters = () => ({
  actions: (actions) => (actions?.length ? `${actions.length} Actions` : "-"),
  //   state: (state) => caseFormatter({ string: state, format: "snakeFormat" }),
  nodeMessages: (messages) =>
    messages?.length ? `${messages.length} Messages` : "-",
  discardAfterSuccessfulExec: (bool) => booleanMap[bool],
  discardAfterFailedExec: (bool) => booleanMap[bool],
});

// export const jobClassGenerators = {
//   state: ["state", (state) => state.toLowerCase().replace(" ", "-")],
//   workflow: ["workflow-path"],
// };

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
  // TODO Add sub menu items
  // {
  //   name: "open",
  //   text: "Open",
  //   callback: async (row, context) => {
  //     consola.trace("Open job submenu action.");
  //     context.$store.dispatch("notification/show", {
  //       message: "Execution opened in new tab.",
  //       type: "success",
  //       showCollapser: false,
  //       autoRemove: false,
  //       details: {
  //         text: "If it does not open automatically, ",
  //         link: {
  //           text: "click here.",
  //           href: await context.$api.forwardToExecutionApp({ jobId: row.id }),
  //           newTab: true,
  //         },
  //       },
  //     });
  //   },
  // },
  // {
  //   name: "delete",
  //   text: "Delete",
  //   callback: (row, context) => {
  //     consola.trace("Discard job submenu action.");
  //     context.$store.dispatch("deployments/deleteJob", { jobId: row.id });
  //   },
  // },
];
