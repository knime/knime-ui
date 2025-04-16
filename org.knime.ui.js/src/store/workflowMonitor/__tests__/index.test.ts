import { describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";

import { APP_ROUTES } from "@/router/appRoutes";
import { router } from "@/router/router";
import { useApplicationStore } from "@/store/application/application";
import { lifecycleBus } from "@/store/application/lifecycle-events";
import { useSVGCanvasStore } from "@/store/canvas/canvas-svg";
import { useSelectionStore } from "@/store/selection";
import { useWorkflowStore } from "@/store/workflow/workflow";
import { createWorkflow, createWorkflowMonitorMessage } from "@/test/factories";
import { useWorkflowMonitorStore } from "../workflowMonitor";

vi.mock("@/router/router", () => {
  return {
    router: {
      push: vi.fn(),
    },
  };
});

vi.mock("@knime/utils");

describe("workflowMonitor", () => {
  const loadStore = () => {
    const testingPinia = createTestingPinia({
      stubActions: false,
      createSpy: vi.fn,
    });

    const workflow = createWorkflow();
    const canvasStore = useSVGCanvasStore(testingPinia);
    const moveObjectIntoView = vi.spyOn(canvasStore, "moveObjectIntoView");
    const kanvas = document.createElement("div");
    kanvas.setAttribute("id", "kanvas");
    kanvas.scrollTo = vi.fn();
    document.body.appendChild(kanvas);

    const $workflowStore = useWorkflowStore(testingPinia);
    const $workflowMonitorStore = useWorkflowMonitorStore(testingPinia);
    const $applicationStore = useApplicationStore(testingPinia);
    const $selectionStore = useSelectionStore(testingPinia);

    $workflowStore.setActiveWorkflow(workflow);
    $applicationStore.setActiveProjectId(workflow.projectId);

    return {
      moveObjectIntoView,
      pinia: testingPinia,
      workflow,
      $workflowStore,
      $workflowMonitorStore,
      $applicationStore,
      $selectionStore,
    };
  };

  it("should navigate to issue in the same workflow", async () => {
    const { $selectionStore, $workflowMonitorStore, moveObjectIntoView } =
      loadStore();

    const message = createWorkflowMonitorMessage();

    await $workflowMonitorStore.navigateToIssue({ message });
    await flushPromises();

    expect($selectionStore.selectedNodeIds).toEqual([message.nodeId]);

    expect(moveObjectIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ id: message.nodeId }),
    );
  });

  it("should navigate to issue in nested workflow", async () => {
    const {
      $selectionStore,
      $workflowMonitorStore,
      workflow,
      moveObjectIntoView,
    } = loadStore();

    const message = createWorkflowMonitorMessage({ workflowId: "root:2" });

    const error = vi.fn();
    $workflowMonitorStore.navigateToIssue({ message }).catch(error);
    await flushPromises();

    lifecycleBus.emit("onWorkflowLoaded");
    await flushPromises();

    expect(router.push).toHaveBeenCalledWith({
      name: APP_ROUTES.WorkflowPage,
      params: { projectId: workflow.projectId, workflowId: message.workflowId },
    });

    expect($selectionStore.selectedNodeIds).toEqual([message.nodeId]);

    expect(moveObjectIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ id: message.nodeId }),
    );

    expect(error).not.toHaveBeenCalled();
  });
});
