import { merge } from "lodash-es";
import type { WorkflowMonitorMessage } from "@/api/gateway-api/generated-api";

export const createWorkflowMonitorMessage = (
  data: Partial<WorkflowMonitorMessage> = {},
): WorkflowMonitorMessage => {
  const issue: WorkflowMonitorMessage = {
    nodeId: "root:1",
    message: "There is something wrong with this node",
    templateId: "org.knime.base.node.preproc.filter.row.RowFilterNodeFactory",
    name: "Row filter",
    workflowId: "root",
  };

  return merge(issue, data);
};
