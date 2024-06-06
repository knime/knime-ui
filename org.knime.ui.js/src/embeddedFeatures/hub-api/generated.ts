import { getClient } from "./client";

export interface Version {}

export interface Workflow {}

export const getRepositoryItem = (workflowId: string): Promise<Version[]> => {
  console.log("calling getWorkflowVersions :>> ", { workflowId });
  return getClient().get(`/repository/${workflowId}`);
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
