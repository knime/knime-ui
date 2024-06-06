import { getClient } from "./client";

export interface Version {
  author: string;
  authorAccountId: string;
  createdOn: string;
  description: string;
  title: string;
  version: number;
}

export interface RepositoryItem {
  id: string;
  itemVersion: number;
  itemVersionCreatedOn: string;
  kudosCount: number;
  lastEditedOn: string;
  lastUploadedOn: string;
  owner: string;
  ownerAccountId: string;
  path: string;
}

export const getRepositoryItem = (
  workflowId: string,
): Promise<RepositoryItem> => {
  return getClient().get(`/repository/${workflowId}`);
};

export const getWorkflowVersions = (
  workflowId: string,
): Promise<{ totalCount: number; versions: Version[] }> => {
  return getClient().get(`/repository/${workflowId}/versions`);
};

export const getExecutionContextsByScope = (
  scope: string,
): Promise<{
  executionContexts: Array<{ id: string; name: string }>;
}> => {
  return getClient().get(`/execution-contexts/${scope}`);
};
