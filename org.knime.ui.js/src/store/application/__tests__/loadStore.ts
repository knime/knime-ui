import { vi } from "vitest";
import { API } from "@api";
import { createTestingPinia } from "@pinia/testing";

import { APP_ROUTES } from "@/router/appRoutes";
import { useCanvasStore } from "@/store/canvas";
import { useNodeConfigurationStore } from "@/store/nodeConfiguration/nodeConfiguration";
import { useNodeRepositoryStore } from "@/store/nodeRepository";
import { useSelectionStore } from "@/store/selection";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { useFloatingMenusStore } from "@/store/workflow/floatingMenus";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { createWorkflow } from "@/test/factories";
import { deepMocked } from "@/test/utils";
import { useApplicationStore } from "../application";
import { useCanvasStateTrackingStore } from "../canvasStateTracking";
import { useLifecycleStore } from "../lifecycle";
import { useApplicationSettingsStore } from "../settings";
import { useWorkflowPreviewSnapshotsStore } from "../workflowPreviewSnapshots";

const mockedAPI = deepMocked(API);

export const applicationState = {
  openProjects: [{ projectId: "foo", name: "bar" }],
};

export const loadStore = () => {
  mockedAPI.application.getState.mockReturnValue(applicationState);
  mockedAPI.desktop.getCustomHelpMenuEntries.mockResolvedValue({});
  mockedAPI.desktop.getExampleProjects.mockResolvedValue([]);
  mockedAPI.event.subscribeEvent.mockResolvedValue({});

  const loadWorkflow = deepMocked(API).workflow.getWorkflow;
  loadWorkflow.mockResolvedValue({ workflow: { info: { containerId: "" } } });

  const testingPinia = createTestingPinia({
    stubActions: false,
    createSpy: vi.fn,
  });

  const applicationStore = useApplicationStore(testingPinia);
  const lifecycleStore = useLifecycleStore(testingPinia);
  const canvasStateTrackingStore = useCanvasStateTrackingStore(testingPinia);
  const workflowStore = useWorkflowStore(testingPinia);
  const nodeRepositoryStore = useNodeRepositoryStore(testingPinia);
  const workflowPreviewSnapshotsStore =
    useWorkflowPreviewSnapshotsStore(testingPinia);

  const canvasStore = useCanvasStore(testingPinia);
  const kanvas = document.createElement("div");
  kanvas.setAttribute("id", "kanvas");
  kanvas.scrollTo = vi.fn();
  kanvas.appendChild(
    document.createElementNS("http://www.w3.org/2000/svg", "svg"),
  );
  canvasStore.setScrollContainerElement(kanvas);

  // @ts-ignore
  canvasStore.screenToCanvasCoordinates = ([x, y]) => [x, y];

  const selectionStore = useSelectionStore(testingPinia);
  const applicationSettingsStore = useApplicationSettingsStore(testingPinia);
  const nodeConfigurationStore = useNodeConfigurationStore(testingPinia);
  const spaceProvidersStore = useSpaceProvidersStore(testingPinia);
  const floatingMenusStore = useFloatingMenusStore(testingPinia);

  workflowStore.setActiveWorkflow(
    createWorkflow({ projectId: "project1", info: { containerId: "root" } }),
  );

  const mockRouter = {
    push: vi.fn(),
    currentRoute: { value: { name: APP_ROUTES.WorkflowPage as string } },
  };

  return {
    applicationStore,
    lifecycleStore,
    canvasStateTrackingStore,
    workflowStore,
    nodeRepositoryStore,
    canvasStore,
    selectionStore,
    applicationSettingsStore,
    nodeConfigurationStore,
    spaceProvidersStore,
    workflowPreviewSnapshotsStore,
    mockRouter,
    floatingMenusStore,
  };
};
