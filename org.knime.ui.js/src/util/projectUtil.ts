import type { ComponentMetadata, Workflow } from "@/api/custom-types";
import {
  EditableMetadata,
  type ProjectMetadata,
  WorkflowInfo,
} from "@/api/gateway-api/generated-api";

export const isWorkflowProjectType = (
  containerType: WorkflowInfo["containerType"],
) => containerType === WorkflowInfo.ContainerTypeEnum.Project;

export const isComponentProjectType = (
  containerType: WorkflowInfo["containerType"],
) => containerType === WorkflowInfo.ContainerTypeEnum.Component;

export const isWorkflowProjectMetadata = (
  metadata: Workflow["metadata"],
): metadata is ProjectMetadata => {
  return metadata.metadataType === EditableMetadata.MetadataTypeEnum.Project;
};

export const isComponentMetadata = (
  metadata: Workflow["metadata"],
): metadata is ComponentMetadata => {
  return metadata.metadataType === EditableMetadata.MetadataTypeEnum.Component;
};
