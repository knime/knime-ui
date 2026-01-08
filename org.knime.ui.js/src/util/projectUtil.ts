import type { ComponentMetadata, Workflow } from "@/api/custom-types";
import {
  EditableMetadata,
  type ProjectMetadata,
  WorkflowInfo,
} from "@/api/gateway-api/generated-api";

const isWorkflowProjectType = (containerType: WorkflowInfo["containerType"]) =>
  containerType === WorkflowInfo.ContainerTypeEnum.Project;

const isComponentProjectType = (containerType: WorkflowInfo["containerType"]) =>
  containerType === WorkflowInfo.ContainerTypeEnum.Component;

export const isProjectMetadata = (
  metadata: Workflow["metadata"],
): metadata is ProjectMetadata => {
  return metadata.metadataType === EditableMetadata.MetadataTypeEnum.Project;
};

export const isComponentMetadata = (
  metadata: Workflow["metadata"],
): metadata is ComponentMetadata => {
  return metadata?.metadataType === EditableMetadata.MetadataTypeEnum.Component;
};

/**
 * Returns whether the given workflow corresponds to that of a component that's
 * inside a normal workflow (aka a subnode), or whether it's a component project
 * (aka a standalone component that was linked and can be opened on its own)
 */
export const isComponentProjectOrWorkflow = (workflow: Workflow) => {
  const isNestedComponent = isComponentProjectType(workflow.info.containerType);
  const isComponentProject = isWorkflowProjectType(workflow.info.containerType);

  return (
    isNestedComponent ||
    (isComponentProject && isComponentMetadata(workflow.metadata))
  );
};
