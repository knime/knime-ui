import { vi } from "vitest";
import { API } from "@api";

import { APP_ROUTES } from "@/router/appRoutes";
import { createWorkflow } from "@/test/factories";
import { deepMocked } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";

const mockedAPI = deepMocked(API);

export const applicationState = {
  openProjects: [{ projectId: "foo", name: "bar" }],
  spaceProviders: [],
};

export const loadStore = () => {
  mockedAPI.application.getState.mockReturnValue(applicationState);
  mockedAPI.desktop.getCustomHelpMenuEntries.mockResolvedValue({});
  mockedAPI.desktop.getExampleProjects.mockResolvedValue([]);
  mockedAPI.event.subscribeEvent.mockResolvedValue({});

  const loadWorkflow = deepMocked(API).workflow.getWorkflow;
  loadWorkflow.mockResolvedValue({ workflow: { info: { containerId: "" } } });

  const mockedStores = mockStores();

  // @ts-expect-error
  mockedStores.canvasStore.screenToCanvasCoordinates = ([x, y]) => [x, y];

  mockedStores.workflowStore.setActiveWorkflow(
    createWorkflow({ projectId: "project1", info: { containerId: "root" } }),
  );

  const mockRouter = {
    push: vi.fn(),
    currentRoute: { value: { name: APP_ROUTES.WorkflowPage as string } },
  };

  return {
    ...mockedStores,
    mockRouter,
  };
};
