import { vi, type Mock } from "vitest";

import type { RootStoreState } from "@/store/types";
import { deepMocked, mockVuexStore } from "@/test/utils";
import { createJob, createSchedule } from "@/test/factories";

import { API } from "@/api";
import { SpaceProviderNS } from "@/api/custom-types";

import * as spacesStore from "../index";
import type {
  Project,
  SpaceItemReference,
} from "@/api/gateway-api/generated-api";

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
    {
      id: "8",
      name: "Component 1",
      type: "Component",
    },
  ],
};

type WithOptionalProviderSpaceGroups = Omit<
  SpaceProviderNS.SpaceProvider,
  "spaceGroups"
> &
  Partial<Pick<SpaceProviderNS.SpaceProvider, "spaceGroups">>;

export const fetchAllSpaceProvidersResponse: Record<
  string,
  WithOptionalProviderSpaceGroups
> = {
  local: {
    id: "local",
    connected: true,
    connectionMode: "AUTOMATIC",
    name: "Local Space",
    type: SpaceProviderNS.TypeEnum.LOCAL,
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

type LoadStoreOpts = {
  mockFetchWorkflowGroupResponse?: typeof fetchWorkflowGroupContentResponse;
  mockFetchAllProvidersResponse?: typeof fetchAllSpaceProvidersResponse;
  mockListJobsForWorkflowResponse?: typeof listJobsForWorkflowResponse;
  mockListSchedulesForWorkflowResponse?: typeof listSchedulesForWorkflowResponse;
  openProjects?: Project[];
  activeProjectId?: string;
  forceCloseProjects?: Mock<any>;
  isUnknownProject?: boolean;
  activeProjectOrigin?: SpaceItemReference | null;
};

export const loadStore = ({
  mockFetchWorkflowGroupResponse = fetchWorkflowGroupContentResponse,
  mockFetchAllProvidersResponse = fetchAllSpaceProvidersResponse,
  mockListJobsForWorkflowResponse = listJobsForWorkflowResponse,
  mockListSchedulesForWorkflowResponse = listSchedulesForWorkflowResponse,
  openProjects = [],
  activeProjectId = "",
  forceCloseProjects = vi.fn(),
  isUnknownProject = false,
  activeProjectOrigin = null,
}: LoadStoreOpts = {}) => {
  const store = mockVuexStore<RootStoreState>({
    spaces: spacesStore,
    application: {
      state: { openProjects, activeProjectId },
      getters: {
        isUnknownProject: () => () => isUnknownProject,
        activeProjectOrigin: () => activeProjectOrigin,
      },
      actions: { updateGlobalLoader: () => {}, forceCloseProjects },
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
