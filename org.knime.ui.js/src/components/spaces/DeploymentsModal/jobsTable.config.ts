import type { Store } from "vuex";

import { columnTypes } from "@knime/knime-ui-table";
import { caseFormatter } from "@knime/utils";

import type { RootStoreState } from "@/store/types";
import { formatTime } from "@/util/time";

export const defaultColumns = ["createdAt", "owner", "state", "nodeMessages"];

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
  owner: "Owner",
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
  owner: columnTypes.String,
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

export const jobFormatters = () => ({
  actions: (actions: unknown[]) =>
    actions?.length ? `${actions.length} Actions` : "-",
  state: (state: string) =>
    caseFormatter({ string: state, format: "snakeFormat" }),
  nodeMessages: (messages: unknown[]) =>
    messages?.length ? `${messages.length} Messages` : "-",
  createdAt: (createdAt: number) => formatTime(createdAt),
});

export const jobClassGenerators = {
  state: ["state", (state: string) => state.toLowerCase().replace(" ", "-")],
  workflow: ["workflow-path"],
  nodeMessages: ["node-messages"],
};

export const popoverRenderers = {
  actions: true,
  configuration: true,
  nodeMessages: {
    type: "MessageRenderer",
    process: (data: any[]) =>
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
    name: "save",
    text: "Save as workflow",
    callback: (
      row: { id: string; name: string },
      context: { $store: Store<RootStoreState> },
    ) => {
      context.$store.dispatch("spaces/saveJobAsWorkflow", {
        jobId: row.id,
        jobName: row.name,
      });
    },
  },
  {
    name: "delete",
    text: "Delete",
    callback: (
      row: { id: string; schedulerId?: string },
      context: { $store: Store<RootStoreState> },
    ) => {
      context.$store.dispatch("spaces/deleteJob", {
        jobId: row.id,
        schedulerId: row.schedulerId ? row.schedulerId : null,
      });
    },
  },
];
