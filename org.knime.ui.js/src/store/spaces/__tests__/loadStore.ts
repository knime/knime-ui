import { type Mock, vi } from "vitest";
import { API } from "@api";
import { createTestingPinia } from "@pinia/testing";

import type {
  Project,
  SpaceItemReference,
} from "@/api/gateway-api/generated-api";
import { useApplicationStore } from "@/store/application/application";
import { useGlobalLoaderStore } from "@/store/application/globalLoader";
import { useDesktopInteractionsStore } from "@/store/workflow/desktopInteractions";
import { createJob, createSchedule } from "@/test/factories";
import { deepMocked } from "@/test/utils";
import { useSpaceAuthStore } from "../auth";
import { useSpaceCachingStore } from "../caching";
import { useDeploymentsStore } from "../deployments";
import { useSpaceProvidersStore } from "../providers";
import { useSpaceOperationsStore } from "../spaceOperations";
import { useSpacesStore } from "../spaces";

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
  mockListJobsForWorkflowResponse = listJobsForWorkflowResponse,
  mockListSchedulesForWorkflowResponse = listSchedulesForWorkflowResponse,
  openProjects = [],
  activeProjectId = "",
  forceCloseProjects = vi.fn(),
  isUnknownProject = false,
  activeProjectOrigin = null,
}: LoadStoreOpts = {}) => {
  const testingPinia = createTestingPinia({
    stubActions: false,
    createSpy: vi.fn,
    initialState: {
      application: {
        openProjects,
        activeProjectId,
      },
    },
  });

  const spacesStore = useSpacesStore(testingPinia);
  const spaceCachingStore = useSpaceCachingStore(testingPinia);
  const spaceProvidersStore = useSpaceProvidersStore(testingPinia);
  const spaceAuthStore = useSpaceAuthStore(testingPinia);
  const deploymentsStore = useDeploymentsStore(testingPinia);
  const spaceOperationsStore = useSpaceOperationsStore(testingPinia);
  const desktopInteractionsStore = useDesktopInteractionsStore(testingPinia);
  const applicationStore = useApplicationStore(testingPinia);
  // @ts-expect-error
  applicationStore.isUnknownProject = () => isUnknownProject;
  // @ts-expect-error

  applicationStore.activeProjectOrigin = activeProjectOrigin ?? undefined;

  vi.mocked(desktopInteractionsStore.forceCloseProjects).mockImplementation(
    forceCloseProjects,
  );
  vi.mocked(
    useGlobalLoaderStore(testingPinia).updateGlobalLoader,
  ).mockImplementation(() => {});

  spaceCachingStore.setProjectPath({
    projectId: "myProject1",
    value: {
      spaceProviderId: "mockProviderId",
      spaceId: "mockSpaceId",
      itemId: "bar",
    },
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

  return {
    testingPinia,
    spacesStore,
    spaceCachingStore,
    spaceProvidersStore,
    spaceAuthStore,
    deploymentsStore,
    spaceOperationsStore,
    applicationStore,
    desktopInteractionsStore,
  };
};
