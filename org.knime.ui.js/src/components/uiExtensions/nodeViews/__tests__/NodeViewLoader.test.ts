import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { VueWrapper, flushPromises, mount } from "@vue/test-utils";
import { API } from "@api";

import { Button } from "@knime/components";
import { CURRENT_STATE_VERSION } from "@knime/hub-features/versions";
import type {
  Alert,
  ApplyState,
  ViewState,
} from "@knime/ui-extension-renderer/api";
import { UIExtension } from "@knime/ui-extension-renderer/vue";

import { SelectionEvent } from "@/api/gateway-api/generated-api";
import { createNativeNode } from "@/test/factories";
import { deepMocked } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";
import ExecuteButton from "../../ExecuteButton.vue";
import { setRestApiBaseUrl } from "../../common/useResourceLocation";
import { useSelectionEvents } from "../../common/useSelectionEvents";
import NodeViewLoader from "../NodeViewLoader.vue";

const mockedAPI = deepMocked(API);

const mockGetNodeView = (additionalMocks?: object) => {
  mockedAPI.node.getNodeView.mockResolvedValue({
    resourceInfo: {
      type: "SHADOW_APP",
      baseUrl: "baseUrl/",
      path: "path",
    },
    nodeInfo: {},
    ...additionalMocks,
  });
};

describe("NodeViewLoader.vue", () => {
  const nodeId = "node1";
  const dummyNode = createNativeNode({
    id: nodeId,
    outPorts: [],
    allowedActions: {
      canExecute: false,
    },
    hasView: true,
  });

  const props = {
    projectId: "project-id",
    workflowId: "workflow-id",
    selectedNode: dummyNode,
    timestamp: 0,
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  const doMount = (versionId?: string) => {
    const mockedStores = mockStores();

    const wrapper = mount(NodeViewLoader, {
      props: { ...props, versionId },
      global: {
        plugins: [mockedStores.testingPinia],
        stubs: { UIExtension: true },
      },
    });

    return { wrapper, mockedStores };
  };

  it("should load nodeView on mount", async () => {
    mockGetNodeView();
    doMount();

    await flushPromises();
    expect(mockedAPI.node.getNodeView).toBeCalledWith({
      projectId: props.projectId,
      workflowId: props.workflowId,
      versionId: CURRENT_STATE_VERSION,
      nodeId,
    });
  });

  it("should load nodeView on mount if versionId prop is set", async () => {
    mockGetNodeView();
    const versionId = "version-id";
    doMount(versionId);

    await flushPromises();
    expect(mockedAPI.node.getNodeView).toBeCalledWith({
      projectId: props.projectId,
      workflowId: props.workflowId,
      versionId,
      nodeId,
    });
  });

  it("is aware of version when computing latestPublishedDataForThisNode", async () => {
    mockGetNodeView();
    const { wrapper, mockedStores } = doMount();
    // 1. no versionId in latestPublishedData
    mockedStores.nodeConfigurationStore.setLatestPublishedData({
      data: { mock: "new-data" },
      projectId: "project-id",
      workflowId: "workflow-id",
      nodeId,
      versionId: undefined,
    });
    const nodeViewLoaderInstance = wrapper.vm as any;

    expect(nodeViewLoaderInstance.latestPublishedDataForThisNode).toEqual({
      mock: "new-data",
    });

    const versionId = "version-id";
    await wrapper.setProps({ versionId });
    expect(
      nodeViewLoaderInstance.latestPublishedDataForThisNode,
    ).toBeUndefined();

    // 2. versionId in latestPublishedData
    mockedStores.nodeConfigurationStore.setLatestPublishedData({
      data: { mock: "new-data" },
      projectId: "project-id",
      workflowId: "workflow-id",
      nodeId,
      versionId: "version-id",
    });
    await wrapper.setProps({ versionId: undefined });
    expect(
      nodeViewLoaderInstance.latestPublishedDataForThisNode,
    ).toBeUndefined();

    await wrapper.setProps({ versionId: "other-version-id" });
    expect(
      nodeViewLoaderInstance.latestPublishedDataForThisNode,
    ).toBeUndefined();
  });

  it("should load the node view when the selected node changes and the new node has a view", async () => {
    mockGetNodeView();
    const { wrapper } = doMount();
    const newNode = { ...dummyNode, id: "node2" };

    await wrapper.setProps({ selectedNode: newNode });

    expect(mockedAPI.node.getNodeView).toBeCalledTimes(2);
    expect(mockedAPI.node.getNodeView).toBeCalledWith(
      expect.objectContaining({
        nodeId: "node2",
      }),
    );
  });

  it("should reset the `activeNodeViewNeedsExecution` flag when reloading view", async () => {
    mockGetNodeView();
    const { wrapper, mockedStores } = doMount();
    mockedStores.nodeConfigurationStore.activeNodeViewNeedsExecution = true;
    const newNode = { ...dummyNode, id: "node2" };

    await wrapper.setProps({ selectedNode: newNode });

    expect(
      mockedStores.nodeConfigurationStore.activeNodeViewNeedsExecution,
    ).toBe(false);
  });

  it("should conditionally deactivate data services on unmount", async () => {
    mockGetNodeView();
    const { wrapper } = doMount();
    wrapper.unmount();
    await flushPromises();
    expect(mockedAPI.node.deactivateNodeDataServices).not.toHaveBeenCalled();

    mockGetNodeView({
      deactivationRequired: true,
    });
    const { wrapper: wrapper2 } = doMount();
    await flushPromises();
    wrapper2.unmount();
    expect(mockedAPI.node.deactivateNodeDataServices).toHaveBeenCalledWith({
      projectId: props.projectId,
      workflowId: props.workflowId,
      versionId: CURRENT_STATE_VERSION,
      nodeId,
      extensionType: "view",
    });
  });

  it("should conditionally deactivate data services if selected nodeId changes", async () => {
    mockGetNodeView();
    const { wrapper } = doMount();
    const newNode = { ...dummyNode, id: "node2" };
    await wrapper.setProps({
      selectedNode: newNode,
    });
    expect(mockedAPI.node.deactivateNodeDataServices).not.toHaveBeenCalled();

    mockGetNodeView({
      deactivationRequired: true,
    });
    const { wrapper: wrapper2 } = doMount();
    await nextTick();
    await wrapper2.setProps({
      selectedNode: newNode,
    });
    expect(
      mockedAPI.node.deactivateNodeDataServices,
    ).toHaveBeenCalledExactlyOnceWith({
      projectId: props.projectId,
      workflowId: props.workflowId,
      versionId: CURRENT_STATE_VERSION,
      nodeId,
      extensionType: "view",
    });
  });

  it("should conditionally deactivate data services on unmount if versionId prop is set", async () => {
    mockGetNodeView();
    const { wrapper } = doMount();
    wrapper.unmount();
    await flushPromises();
    expect(mockedAPI.node.deactivateNodeDataServices).not.toHaveBeenCalled();

    mockGetNodeView({
      deactivationRequired: true,
    });
    const versionId = "version-id";
    const { wrapper: wrapper2 } = doMount(versionId);
    await flushPromises();
    wrapper2.unmount();
    expect(mockedAPI.node.deactivateNodeDataServices).toHaveBeenCalledWith({
      projectId: props.projectId,
      workflowId: props.workflowId,
      versionId,
      nodeId,
      extensionType: "view",
    });
  });

  describe("apiLayer", () => {
    const getApiLayer = (wrapper: VueWrapper<any>) => {
      const uiExtension = wrapper.findComponent(UIExtension);
      return uiExtension.props("apiLayer");
    };

    it("implements getResourceLocation", async () => {
      mockGetNodeView();
      const { wrapper } = doMount();
      await flushPromises();

      const apiLayer = getApiLayer(wrapper);

      const location = await apiLayer.getResourceLocation("path1");

      expect(location).toBe("baseUrl/path1");
    });

    it("implements getResourceLocation in apiLayer (when rest api base url is defined)", async () => {
      mockedAPI.node.getNodeView.mockResolvedValueOnce({
        resourceInfo: {
          type: "SHADOW_APP",
          baseUrl: "",
          path: "path",
        },
      });

      setRestApiBaseUrl("API_URL_BASE");
      const { wrapper, mockedStores } = doMount();
      await flushPromises();
      mockedStores.applicationStore.setActiveProjectId("project1");

      const apiLayer = getApiLayer(wrapper);

      const location = await apiLayer.getResourceLocation("path1");

      expect(location).toBe(
        "API_URL_BASE/jobs/project1/workflow/wizard/web-resources/path1",
      );
    });

    it("implements callNodeDataService", async () => {
      mockGetNodeView();
      mockedAPI.node.callNodeDataService.mockResolvedValue({ something: true });
      const { wrapper } = doMount();
      await flushPromises();

      const apiLayer = getApiLayer(wrapper);

      const result = await apiLayer.callNodeDataService({
        nodeId: "",
        projectId: "",
        workflowId: "",
        extensionType: "",
        serviceType: "data",
        dataServiceRequest: "request",
      });

      expect(result).toStrictEqual({ result: { something: true } });

      expect(mockedAPI.node.callNodeDataService).toHaveBeenCalledWith({
        dataServiceRequest: "request",
        extensionType: "view",
        nodeId,
        projectId: "project-id",
        serviceType: "data",
        workflowId: "workflow-id",
        versionId: CURRENT_STATE_VERSION,
      });
    });

    it("calls callNodeDataService with versionId if versionId is included in props", async () => {
      mockGetNodeView();
      mockedAPI.node.callNodeDataService.mockResolvedValue({ something: true });
      const versionId = "version-id";
      const { wrapper } = doMount(versionId);
      await flushPromises();

      const apiLayer = getApiLayer(wrapper);

      const result = await apiLayer.callNodeDataService({
        nodeId: "",
        projectId: "",
        workflowId: "",
        extensionType: "",
        serviceType: "data",
        dataServiceRequest: "request",
      });

      expect(result).toStrictEqual({ result: { something: true } });

      expect(mockedAPI.node.callNodeDataService).toHaveBeenCalledWith({
        dataServiceRequest: "request",
        extensionType: "view",
        nodeId,
        projectId: "project-id",
        serviceType: "data",
        workflowId: "workflow-id",
        versionId,
      });
    });

    it("implements sendAlert", async () => {
      const { wrapper } = doMount();
      await flushPromises();

      const apiLayer = getApiLayer(wrapper);

      const alert1: Alert = {
        type: "error",
        message: "There's an warning in this node",
      };
      apiLayer.sendAlert(alert1);

      expect(wrapper.emitted("alert")![1][0]).toEqual({ alert: alert1 });
    });

    it("implements registerPushEventService to set the event dispatcher to update the view data", async () => {
      mockGetNodeView();
      const { wrapper, mockedStores } = doMount();
      await flushPromises();

      const apiLayer = getApiLayer(wrapper);
      const pushEventDispatcher = vi.fn();
      apiLayer.registerPushEventService({
        dispatchPushEvent: pushEventDispatcher,
      });

      mockedStores.nodeConfigurationStore.setLatestPublishedData({
        data: { mock: "new-data" },
        projectId: "project-id",
        workflowId: "workflow-id",
        nodeId: "another node",
      });
      await nextTick();
      expect(pushEventDispatcher).not.toHaveBeenCalled();

      mockedStores.nodeConfigurationStore.setLatestPublishedData({
        data: { mock: "new-data" },
        projectId: "project-id",
        workflowId: "workflow-id",
        nodeId,
      });
      await nextTick();

      expect(pushEventDispatcher).toHaveBeenCalledWith({
        eventType: "DataEvent",
        payload: { mock: "new-data" },
      });
    });

    it("implements registerPushEventService to listen to selection events", async () => {
      mockGetNodeView();
      const { wrapper } = doMount();
      await flushPromises();

      const apiLayer = getApiLayer(wrapper);

      const dispatchPushEvent = vi.fn();
      const removeListener = apiLayer.registerPushEventService({
        dispatchPushEvent,
      });

      expect(dispatchPushEvent).not.toHaveBeenCalled();

      const { notifyListeners } = useSelectionEvents();

      const mockSelectionEvent: SelectionEvent = {
        projectId: props.projectId,
        workflowId: props.workflowId,
        nodeId: dummyNode.id,
        mode: SelectionEvent.ModeEnum.ADD,
      };

      notifyListeners(mockSelectionEvent);

      expect(dispatchPushEvent).toHaveBeenCalledOnce();
      expect(dispatchPushEvent).toHaveBeenCalledWith({
        eventType: "SelectionEvent",
        payload: mockSelectionEvent,
      });

      notifyListeners({
        projectId: "some other project",
        workflowId: "some other workflow",
        nodeId: "some other node",
        mode: SelectionEvent.ModeEnum.ADD,
      });

      expect(dispatchPushEvent).toHaveBeenCalledOnce();

      removeListener();

      notifyListeners(mockSelectionEvent);
      expect(dispatchPushEvent).toHaveBeenCalledOnce();
    });

    it("implements updateDataPointSelection", async () => {
      mockGetNodeView();
      mockedAPI.node.updateDataPointSelection.mockResolvedValue({
        something: true,
      });
      const { wrapper } = doMount();
      await flushPromises();

      const apiLayer = getApiLayer(wrapper);

      const result = await apiLayer.updateDataPointSelection({
        nodeId: "",
        projectId: "",
        workflowId: "",
        mode: "ADD",
        selection: ["Row1", "Row3"],
      });

      expect(result).toStrictEqual({ result: { something: true } });

      expect(mockedAPI.node.updateDataPointSelection).toHaveBeenCalledWith({
        nodeId,
        projectId: "project-id",
        workflowId: "workflow-id",
        versionId: CURRENT_STATE_VERSION,
        mode: "ADD",
        selection: ["Row1", "Row3"],
      });
    });

    it("implements updateDataPointSelection if versionId prop is set", async () => {
      mockGetNodeView();
      mockedAPI.node.updateDataPointSelection.mockResolvedValue({
        something: true,
      });
      const versionId = "version-id";
      const { wrapper } = doMount(versionId);
      await flushPromises();
      const apiLayer = getApiLayer(wrapper);

      await apiLayer.updateDataPointSelection({
        nodeId: "",
        projectId: "",
        workflowId: "",
        mode: "ADD",
        selection: ["Row1", "Row3"],
      });

      expect(mockedAPI.node.updateDataPointSelection).toHaveBeenCalledWith({
        nodeId,
        projectId: "project-id",
        workflowId: "workflow-id",
        versionId,
        mode: "ADD",
        selection: ["Row1", "Row3"],
      });
    });
  });

  it("should render execute button if view should re-execute based on node config dirty state", async () => {
    mockGetNodeView();
    const { wrapper, mockedStores } = doMount();
    await flushPromises();

    expect(wrapper.findComponent(ExecuteButton).exists()).toBe(false);
    expect(wrapper.findComponent(UIExtension).exists()).toBe(true);

    mockedStores.nodeConfigurationStore.setDirtyState({
      apply: "configured" satisfies ApplyState,
      view: "configured" satisfies ViewState,
    });
    await nextTick();

    expect(wrapper.findComponent(ExecuteButton).exists()).toBe(true);
    expect(wrapper.findComponent(ExecuteButton).props("message")).toBe(
      "To preview the node, apply your changes and re-execute it.",
    );
    expect(wrapper.findComponent(ExecuteButton).props("buttonLabel")).toBe(
      "Apply & execute",
    );
    expect(wrapper.findComponent(UIExtension).exists()).toBe(false);
  });

  it("calls applySettings with correct arguments when ExecuteButton is clicked", async () => {
    mockGetNodeView();
    const { wrapper, mockedStores } = doMount();

    mockedStores.nodeConfigurationStore.setDirtyState({
      apply: "configured",
      view: "configured",
    });
    await flushPromises();

    expect(wrapper.findComponent(ExecuteButton).exists()).toBe(true);

    await wrapper.findComponent(Button).trigger("click");
    expect(
      mockedStores.nodeConfigurationStore.applySettings,
    ).toHaveBeenCalledExactlyOnceWith({ nodeId, execute: true });
  });
});
