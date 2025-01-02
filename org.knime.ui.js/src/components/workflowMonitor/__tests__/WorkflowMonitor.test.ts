import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { API } from "@api";

import type { WorkflowMonitorState } from "@/api/gateway-api/generated-api";
import * as panelStore from "@/store/panel";
import {
  createAvailablePortTypes,
  createNodeTemplate,
  createWorkflow,
  createWorkflowMonitorMessage,
} from "@/test/factories";
import { deepMocked } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";
import WorkflowMonitor from "../WorkflowMonitor.vue";

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
    const mockedStores = mockStores();

    mockedStores.workflowStore.setActiveWorkflow(createWorkflow());
    mockedStores.applicationStore.setActiveProjectId("project1");
    const availablePortTypes = createAvailablePortTypes();
    mockedStores.applicationStore.setAvailablePortTypes(availablePortTypes);

    const wrapper = mount(WorkflowMonitor, {
      global: { plugins: [mockedStores.testingPinia] },
    });

    return { wrapper, mockedStores };
  };

  it("should activate/deactivate workflow monitor when tab is selected", async () => {
    mockedAPI.workflow.getWorkflowMonitorState.mockResolvedValueOnce({
      state: workflowMonitorStateMock,
      snapshotId: "snapshot1",
    });

    const { mockedStores } = doMount();

    expect(
      mockedStores.workflowMonitorStore.activateWorkflowMonitor,
    ).not.toHaveBeenCalled();
    expect(
      mockedStores.workflowMonitorStore.deactivateWorkflowMonitor,
    ).not.toHaveBeenCalled();
    expect(mockedStores.nodeTemplatesStore.cache).toEqual({});

    mockedStores.panelStore.setCurrentProjectActiveTab(
      panelStore.TABS.WORKFLOW_MONITOR,
    );

    await flushPromises();
    expect(
      mockedStores.workflowMonitorStore.activateWorkflowMonitor,
    ).toHaveBeenCalled();

    expect(mockedStores.workflowMonitorStore.currentState).toEqual(
      workflowMonitorStateMock,
    );
    expect(mockedStores.workflowMonitorStore.hasLoaded).toBe(true);
    expect(mockedStores.workflowMonitorStore.isLoading).toBe(false);
    expect(mockedAPI.event.subscribeEvent).toHaveBeenCalledWith({
      typeId: "WorkflowMonitorStateChangeEventType",
      projectId: "project1",
      snapshotId: "snapshot1",
    });

    expect(mockedStores.nodeTemplatesStore.cache).toEqual({
      [nodeTemplate1.id]: expect.objectContaining({ id: nodeTemplate1.id }),
      [nodeTemplate2.id]: expect.objectContaining({ id: nodeTemplate2.id }),
    });

    mockedStores.panelStore.setCurrentProjectActiveTab(
      panelStore.TABS.CONTEXT_AWARE_DESCRIPTION,
    );
    await nextTick();

    expect(
      mockedStores.workflowMonitorStore.deactivateWorkflowMonitor,
    ).toHaveBeenCalled();

    expect(mockedAPI.event.unsubscribeEventListener).toHaveBeenCalledWith({
      typeId: "WorkflowMonitorStateChangeEventType",
      projectId: "project1",
      snapshotId: "<UNUSED>",
    });
  });
});
