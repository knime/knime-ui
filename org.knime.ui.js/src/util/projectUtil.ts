import type { Workflow } from "@/api/custom-types";
import { WorkflowInfo } from "@/api/gateway-api/generated-api";

const isWorkflowProjectType = (containerType: WorkflowInfo["containerType"]) =>
  containerType === WorkflowInfo.ContainerTypeEnum.Project;

const isComponentProjectType = (containerType: WorkflowInfo["containerType"]) =>
  containerType === WorkflowInfo.ContainerTypeEnum.Component;

export const isWorkflowProject = (workflow: Workflow) => {
  return (
    isWorkflowProjectType(workflow.info.containerType) &&
    workflow.projectMetadata &&
    !workflow.componentMetadata
  );
};

export const isComponentProject = (workflow: Workflow) => {
  const isNestedComponent = isComponentProjectType(workflow.info.containerType);
  const isComponentProject = isWorkflowProjectType(workflow.info.containerType);

  return (
    isNestedComponent ||
    (isComponentProject &&
      workflow.componentMetadata &&
      !workflow.projectMetadata)
  );
};
