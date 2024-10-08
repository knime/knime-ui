import type { Project } from "@/api/gateway-api/generated-api";

import type { WorkflowState } from "./index";

export const getProjectAndWorkflowIds = (state: WorkflowState) => {
  const {
    projectId,
    info: { containerId },
  } = state.activeWorkflow!;

  return { projectId, workflowId: containerId };
};

/**
 * Determines which project id should be set after closing the active one
 *
 * @returns next project id to set
 */
export const getNextProjectId = ({
  openProjects,
  activeProjectId,
  closingProjectIds,
}: {
  openProjects: Array<Pick<Project, "projectId">>;
  activeProjectId: string | null;
  closingProjectIds: Array<string>;
}) => {
  if (!closingProjectIds.includes(activeProjectId ?? "")) {
    return activeProjectId;
  }

  if (openProjects.length === 1) {
    return null; // null equals going to the entry page
  }

  const remainingProjects = openProjects.filter(
    (project) => !closingProjectIds.includes(project.projectId),
  );

  if (remainingProjects.length === 0) {
    return null; // null equals going to the entry page
  }

  return remainingProjects.at(-1)!.projectId;
};
