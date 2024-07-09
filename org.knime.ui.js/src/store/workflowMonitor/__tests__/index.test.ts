import { describe, expect, it, vi } from "vitest";
import { mockVuexStore } from "@/test/utils";

import { createWorkflow, createWorkflowMonitorMessage } from "@/test/factories";
import * as applicationStore from "../../application";
import * as workflowStore from "../../workflow";
import * as selectionStore from "../../selection";
import * as workflowMonitorStore from "../index";
import { flushPromises } from "@vue/test-utils";
import { router } from "@/router/router";
import { lifecycleBus } from "@/store/application/lifecycle-events";
import { APP_ROUTES } from "@/router/appRoutes";

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
    const moveObjectIntoView = vi.fn();

    const $store = mockVuexStore({
      workflow: workflowStore,
      workflowMonitor: workflowMonitorStore,
      application: applicationStore,
      selection: selectionStore,
      canvas: {
        actions: { moveObjectIntoView },
      },
    });

    const workflow = createWorkflow();
    $store.commit("workflow/setActiveWorkflow", workflow);
    $store.commit("application/setActiveProjectId", workflow.projectId);

    return { $store, moveObjectIntoView, workflow };
  };

  it("should navigate to issue in the same workflow", async () => {
    const { $store, moveObjectIntoView } = loadStore();

    const message = createWorkflowMonitorMessage();

    await $store.dispatch("workflowMonitor/navigateToIssue", { message });
    await flushPromises();

    expect($store.state.selection.selectedNodes).toEqual({
      [message.nodeId]: true,
    });

    expect(moveObjectIntoView).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: message.nodeId }),
    );
  });

  it("should navigate to issue in nested workflow", async () => {
    const { $store, workflow, moveObjectIntoView } = loadStore();

    const message = createWorkflowMonitorMessage({ workflowId: "root:2" });

    $store.dispatch("workflowMonitor/navigateToIssue", { message });
    lifecycleBus.emit("onWorkflowLoaded");
    await flushPromises();

    expect(router.push).toHaveBeenCalledWith({
      name: APP_ROUTES.WorkflowPage,
      params: { projectId: workflow.projectId, workflowId: message.workflowId },
    });

    expect($store.state.selection.selectedNodes).toEqual({
      [message.nodeId]: true,
    });

    expect(moveObjectIntoView).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: message.nodeId }),
    );
  });
});
