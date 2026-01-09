import type { ComponentMetadata, Workflow } from "@/api/custom-types";
import {
  EditableMetadata,
  type Project,
  type ProjectMetadata,
  WorkflowInfo,
} from "@/api/gateway-api/generated-api";
import { hashString } from "@/util/encoding";

const isWorkflowProjectType = (containerType: WorkflowInfo["containerType"]) =>
  containerType === WorkflowInfo.ContainerTypeEnum.Project;

const isComponentProjectType = (containerType: WorkflowInfo["containerType"]) =>
  containerType === WorkflowInfo.ContainerTypeEnum.Component;

const isProjectMetadata = (
  metadata: Workflow["metadata"],
): metadata is ProjectMetadata => {
  return metadata.metadataType === EditableMetadata.MetadataTypeEnum.Project;
};

const isComponentMetadata = (
  metadata: Workflow["metadata"],
): metadata is ComponentMetadata => {
  return metadata?.metadataType === EditableMetadata.MetadataTypeEnum.Component;
};

/**
 * Returns whether the given workflow corresponds to that of a component that's
 * inside a normal workflow (aka a subnode), or whether it's a component project
 * (aka a standalone component that was linked and can be opened on its own)
 */
const isComponentProjectOrWorkflow = (workflow: Workflow) => {
  const isNestedComponent = isComponentProjectType(workflow.info.containerType);
  const isComponentProject = isWorkflowProjectType(workflow.info.containerType);

  return (
    isNestedComponent ||
    (isComponentProject && isComponentMetadata(workflow.metadata))
  );
};

/**
 * Generates a "stable" ID for the provided project by hashing the project's
 * origin information (if available) with the user's context (username and provider ID).
 *
 * Example use-case:
 * Per-workflow permissions for K-AI. The same project needs a different ID for
 * the same username across different Hubs (user can have the same username "john.doe"
 * on Hub A and Hub B, but the per-workflow K-AI permissions shouldn't be shared across Hubs).
 */
export const toStableProjectId = (
  project: Project,
  username: string,
  providerId: string,
) => {
  if (!project.origin) {
    return null;
  }

  const stableProjectId = `${project.origin.providerId}:${project.origin.spaceId}:${project.origin.itemId}`;

  return hashString(`${stableProjectId}:${providerId}:${username}`);
};

export const project = {
  isProjectMetadata,
  isComponentMetadata,
  isComponentProjectOrWorkflow,
  toStableProjectId,
};
