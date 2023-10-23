import merge from "lodash/merge";
import type { WorkflowProject } from "@/api/gateway-api/generated-api";
import type { DeepPartial } from "../utils";

export const createWorkflowProject = (
  data: DeepPartial<WorkflowProject>,
): WorkflowProject => {
  const base: WorkflowProject = {
    projectId: "project1",
    name: "GeneratedMockProject",
  };

  return merge(base, data);
};
