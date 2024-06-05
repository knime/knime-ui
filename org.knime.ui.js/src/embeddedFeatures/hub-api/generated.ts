import { getClient } from "./client";

export interface Version {}

export interface Workflow {}

export const getWorkflowVersions = (workflowId: string): Promise<Version[]> => {
  console.log("calling getWorkflowVersions :>> ", { workflowId });
  return getClient().get(`/execution/workflow/${workflowId}`);
};

export const executeWorkflow = (
  workflowId: string,
  executionContextId: string,
): Promise<Version[]> => {
  console.log("calling executeWorkflow :>> ", {
    workflowId,
    executionContextId,
  });

  return getClient().post(`/execution/workflow/${workflowId}`, {
    executionContextId,
  });
};
