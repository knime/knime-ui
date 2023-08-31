import type { RootStoreState } from "@/store/types";
import { deepMocked, mockVuexStore } from "@/test/utils";

import { API } from "@api";

import * as spacesStore from "../index";
import { vi } from "vitest";
import { createJob, createSchedule } from "@/test/factories";

export const fetchWorkflowGroupContentResponse = {
  id: "root",
  path: [],
  items: [
    {
      id: "1",
      name: "Folder 1",
      type: "WorkflowGroup",
    },
    {
      id: "2",
      name: "Folder 2",
      type: "WorkflowGroup",
    },
    {
      id: "4",
      name: "File 2",
      type: "Workflow",
    },
  ],
};

export const fetchAllSpaceProvidersResponse = {
  local: {
    id: "local",
    connected: true,
    connectionMode: "AUTOMATIC",
    name: "Local Space",
  },
};

export const listJobsForWorkflowResponse = [
  createJob({
    id: "1",
    createdAt: 1693229280.004036,
    name: "Workflow 1",
  }),
  createJob({
    id: "2",
    createdAt: 1692875153.637449,
    name: "Workflow 2",
  }),
];

export const listSchedulesForWorkflowResponse = [
  createSchedule({
    id: "1",
    lastRun: 1693230480.002202,
  }),
];

const mockedAPI = deepMocked(API);

export const loadStore = ({
  mockFetchWorkflowGroupResponse = fetchWorkflowGroupContentResponse,
  mockFetchAllProvidersResponse = fetchAllSpaceProvidersResponse,
  mockListJobsForWorkflowResponse = listJobsForWorkflowResponse,
  mockListSchedulesForWorkflowResponse = listSchedulesForWorkflowResponse,
  openProjects = [],
  activeProjectId = "",
} = {}) => {
  const store = mockVuexStore<RootStoreState>({
    spaces: spacesStore,
    application: {
      state: { openProjects, activeProjectId },
      actions: { updateGlobalLoader: () => {} },
    },
  });

  store.state.spaces.projectPath.myProject1 = {
    spaceProviderId: "mockProviderId",
    spaceId: "mockSpaceId",
    itemId: "bar",
  };

  mockedAPI.desktop.getSpaceProviders.mockImplementation(() => {
    store.dispatch(
      "spaces/setAllSpaceProviders",
      mockFetchAllProvidersResponse,
    );
  });
  mockedAPI.space.listWorkflowGroup.mockResolvedValue(
    mockFetchWorkflowGroupResponse,
  );
  mockedAPI.space.listJobsForWorkflow.mockResolvedValue(
    mockListJobsForWorkflowResponse,
  );
  mockedAPI.space.listSchedulesForWorkflow.mockResolvedValue(
    mockListSchedulesForWorkflowResponse,
  );

  const dispatchSpy = vi.spyOn(store, "dispatch");

  return { store, dispatchSpy };
};
