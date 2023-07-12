import type { RootStoreState } from "@/store/types";
import { deepMocked, mockVuexStore } from "@/test/utils";

import { API } from "@api";

import * as spacesStore from "../index";
import { vi } from "vitest";

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

const mockedAPI = deepMocked(API);

export const loadStore = ({
  mockFetchWorkflowGroupResponse = fetchWorkflowGroupContentResponse,
  mockFetchAllProvidersResponse = fetchAllSpaceProvidersResponse,
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
      mockFetchAllProvidersResponse
    );
  });
  mockedAPI.space.listWorkflowGroup.mockResolvedValue(
    mockFetchWorkflowGroupResponse
  );

  const dispatchSpy = vi.spyOn(store, "dispatch");

  return { store, dispatchSpy };
};
