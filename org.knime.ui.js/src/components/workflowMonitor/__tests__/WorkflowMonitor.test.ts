import { describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

import { API } from "@api";
import * as workflowMonitorStore from "@/store/workflowMonitor";
import * as panelStore from "@/store/panel";
import * as applicationStore from "@/store/application";
import { deepMocked, mockVuexStore } from "@/test/utils";

import WorkflowMonitor from "../WorkflowMonitor.vue";
import type { WorkflowMonitorState } from "@/api/gateway-api/generated-api";
import {
  createAvailablePortTypes,
  createNodeTemplate,
  createWorkflowMonitorMessage,
} from "@/test/factories";

vi.mock("lodash-es", async () => {
  const actual = await vi.importActual("lodash-es");
  const { lodashMockFactory } = await import("@/test/utils/mockLodash");

  return {
    ...actual,
    ...lodashMockFactory(),
  };
});

const mockedAPI = deepMocked(API);

describe("WorkflowMonitor.vue", () => {
  const workflowMonitorStateMock: WorkflowMonitorState = {
    errors: [
      createWorkflowMonitorMessage({
        nodeId: "root:1",
        message: "something is really bad with this node",
        templateId: "org.node.type1",
      }),
    ],
    warnings: [
      createWorkflowMonitorMessage({
        nodeId: "root:1",
        message: "something is ok-ish with this node",
        templateId: "org.node.type2",
      }),
    ],
  };

  const nodeTemplate1 = createNodeTemplate({ id: "org.node.type1" });
  const nodeTemplate2 = createNodeTemplate({ id: "org.node.type2" });

  mockedAPI.noderepository.getNodeTemplates.mockResolvedValue({
    [nodeTemplate1.id]: nodeTemplate1,
    [nodeTemplate2.id]: nodeTemplate2,
  });

  const doMount = () => {
    const $store = mockVuexStore({
      workflowMonitor: workflowMonitorStore,
      panel: panelStore,
      application: applicationStore,
    });

    $store.commit("application/setActiveProjectId", "project1");
    const availablePortTypes = createAvailablePortTypes();
    $store.commit("application/setAvailablePortTypes", availablePortTypes);

    const dispatchSpy = vi.spyOn($store, "dispatch");

    const wrapper = mount(WorkflowMonitor, {
      global: { plugins: [$store] },
    });

    return { wrapper, $store, dispatchSpy };
  };

  it("should activate/deactivate workflow monitor when tab is selected", async () => {
    mockedAPI.workflow.getWorkflowMonitorState.mockResolvedValueOnce({
      state: workflowMonitorStateMock,
      snapshotId: "snapshot1",
    });

    const { $store, dispatchSpy } = doMount();

    expect(dispatchSpy).not.toHaveBeenCalledWith(
      "workflowMonitor/activateWorkflowMonitor",
    );
    expect(dispatchSpy).not.toHaveBeenCalledWith(
      "workflowMonitor/deactivateWorkflowMonitor",
    );
    expect($store.state.workflowMonitor.nodeTemplates).toEqual({});

    await $store.dispatch(
      "panel/setCurrentProjectActiveTab",
      panelStore.TABS.WORKFLOW_MONITOR,
    );

    await flushPromises();

    expect(dispatchSpy).toHaveBeenCalledWith(
      "workflowMonitor/activateWorkflowMonitor",
    );

    expect($store.state.workflowMonitor.currentState).toEqual(
      workflowMonitorStateMock,
    );
    expect($store.state.workflowMonitor.hasLoaded).toBe(true);
    expect($store.state.workflowMonitor.isLoading).toBe(false);
    expect(mockedAPI.event.subscribeEvent).toHaveBeenCalledWith({
      typeId: "WorkflowMonitorStateChangeEventType",
      projectId: "project1",
      snapshotId: "snapshot1",
    });

    expect($store.state.workflowMonitor.nodeTemplates).toEqual({
      [nodeTemplate1.id]: expect.objectContaining({ id: nodeTemplate1.id }),
      [nodeTemplate2.id]: expect.objectContaining({ id: nodeTemplate2.id }),
    });

    await $store.dispatch(
      "panel/setCurrentProjectActiveTab",
      panelStore.TABS.CONTEXT_AWARE_DESCRIPTION,
    );

    expect(dispatchSpy).toHaveBeenCalledWith(
      "workflowMonitor/deactivateWorkflowMonitor",
    );

    expect(mockedAPI.event.unsubscribeEventListener).toHaveBeenCalledWith({
      typeId: "WorkflowMonitorStateChangeEventType",
      projectId: "project1",
      snapshotId: "<UNUSED>",
    });
  });
});
