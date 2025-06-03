/* eslint-disable max-lines */
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { VueWrapper, flushPromises, mount } from "@vue/test-utils";
import { API } from "@api";

import { CURRENT_STATE_VERSION } from "@knime/hub-features/versions";
import { UIExtension } from "@knime/ui-extension-renderer/vue";

import type { KnimeNode } from "@/api/custom-types";
import {
  Node,
  NodeState,
  SelectionEvent,
} from "@/api/gateway-api/generated-api";
import { deepMocked } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";
import { setRestApiBaseUrl } from "../../common/useResourceLocation";
import { useSelectionEvents } from "../../common/useSelectionEvents";
import DataValueViewWrapper from "../../dataValueViews/DataValueViewWrapper.vue";
import PortViewLoader from "../PortViewLoader.vue";

const mockedAPI = deepMocked(API);

describe("PortViewLoader.vue", () => {
  const nodeId = "node1";
  const dummyNode: KnimeNode = {
    id: nodeId,
    name: "node1",
    outPorts: [
      {
        index: 1,
        connectedVia: [],
        typeId: "someTypeId",
        portContentVersion: 1,
      },
      {
        index: 2,
        connectedVia: [],
        typeId: "someTypeId",
        portContentVersion: 2,
      },
    ],
    inPorts: [],
    state: {
      executionState: NodeState.ExecutionStateEnum.IDLE,
    },
    allowedActions: {
      canExecute: false,
      canCancel: false,
      canReset: false,
    },
    position: { x: 0, y: 0 },
    kind: Node.KindEnum.Node,
    hasView: true,
  };

  const projectId = "project-id";
  const workflowId = "workflow-id";

  const props = {
    projectId,
    workflowId,
    selectedNode: dummyNode,
    selectedPortIndex: 0,
    selectedViewIndex: 0,
    uniquePortKey: "",
  };

  afterEach(() => {
    mockedAPI.port.getPortView.mockReset();
    mockedAPI.port.deactivatePortDataServices.mockReset();
    mockedAPI.port.callPortDataService.mockReset();
  });

  const mockGetPortView = (additionalMocks?: object) => {
    mockedAPI.port.getPortView.mockResolvedValue({
      resourceInfo: {
        type: "SHADOW_APP",
        baseUrl: "baseUrl/",
        path: "path",
      },
      ...additionalMocks,
    });
  };

  const mockGetDataValueView = (additionalMocks?: object) => {
    mockedAPI.port.getDataValueView.mockResolvedValue({
      resourceInfo: {
        type: "SHADOW_APP",
        baseUrl: "baseUrl/",
        path: "path",
      },
      ...additionalMocks,
    });
  };

  const doMount = (customProps = {}) => {
    const mockedStores = mockStores();

    const wrapper = mount(PortViewLoader, {
      props: { ...props, ...customProps },
      global: {
        plugins: [mockedStores.testingPinia],
        stubs: { UIExtension: true },
      },
    });

    return { wrapper, mockedStores };
  };

  it("should load port view on mount if versionId is not set as prop", () => {
    mockGetPortView();
    doMount();

    expect(mockedAPI.port.getPortView).toBeCalledWith({
      projectId: props.projectId,
      workflowId: props.workflowId,
      versionId: CURRENT_STATE_VERSION,
      nodeId: props.selectedNode.id,
      portIdx: props.selectedPortIndex,
      viewIdx: props.selectedViewIndex,
    });
  });

  it("should load port view on mount if versionId is set as prop", () => {
    mockGetPortView();
    const versionId = "version-id";
    doMount({ versionId });

    expect(mockedAPI.port.getPortView).toBeCalledWith({
      projectId: props.projectId,
      workflowId: props.workflowId,
      versionId,
      nodeId: props.selectedNode.id,
      portIdx: props.selectedPortIndex,
      viewIdx: props.selectedViewIndex,
    });
  });

  it("should conditionally deactivate data services on unmount", async () => {
    mockGetPortView();
    const { wrapper } = doMount();
    wrapper.unmount();
    expect(mockedAPI.port.deactivatePortDataServices).not.toHaveBeenCalled();

    mockGetPortView({
      deactivationRequired: true,
    });
    const { wrapper: wrapper2 } = doMount();
    await flushPromises();
    wrapper2.unmount();
    expect(mockedAPI.port.deactivatePortDataServices).toHaveBeenCalledWith({
      projectId: props.projectId,
      workflowId: props.workflowId,
      versionId: CURRENT_STATE_VERSION,
      nodeId: props.selectedNode.id,
      portIdx: props.selectedPortIndex,
      viewIdx: props.selectedViewIndex,
    });
  });

  it("should conditionally deactivate data services if uniquePortKey changes", async () => {
    mockGetPortView();
    const { wrapper } = doMount();
    const newNode = { ...dummyNode, id: "node2" };

    await wrapper.setProps({
      selectedNode: newNode,
      uniquePortKey: "key-that-changed",
    });
    expect(mockedAPI.port.deactivatePortDataServices).not.toHaveBeenCalled();

    mockGetPortView({
      deactivationRequired: true,
    });
    const { wrapper: wrapper2 } = doMount();
    await nextTick();
    await wrapper2.setProps({
      selectedNode: newNode,
      uniquePortKey: "key-that-changed",
    });
    expect(
      mockedAPI.port.deactivatePortDataServices,
    ).toHaveBeenCalledExactlyOnceWith({
      projectId: props.projectId,
      workflowId: props.workflowId,
      versionId: CURRENT_STATE_VERSION,
      nodeId,
      portIdx: props.selectedPortIndex,
      viewIdx: props.selectedViewIndex,
    });
  });

  it("should conditionally deactivate data services on unmount if versionId is set as prop", async () => {
    mockGetPortView({
      deactivationRequired: true,
    });

    const versionId = "version-id";
    const { wrapper } = doMount({ versionId });
    await flushPromises();
    wrapper.unmount();
    expect(mockedAPI.port.deactivatePortDataServices).toHaveBeenCalledWith({
      projectId: props.projectId,
      workflowId: props.workflowId,
      versionId,
      nodeId: props.selectedNode.id,
      portIdx: props.selectedPortIndex,
      viewIdx: props.selectedViewIndex,
    });
  });

  describe("load data on uniquePortKeyChange", () => {
    it("should load port view when the selected node changes", async () => {
      mockGetPortView();
      const { wrapper } = doMount();
      const newNode = { ...dummyNode, id: "node2" };

      await wrapper.setProps({
        selectedNode: newNode,
        uniquePortKey: "key-that-changed",
      });

      expect(mockedAPI.port.getPortView).toBeCalledTimes(2);
      expect(mockedAPI.port.getPortView).toBeCalledWith(
        expect.objectContaining({
          nodeId: "node2",
        }),
      );
    });

    it("should load port view when the selected port index changes", async () => {
      mockGetPortView();
      const { wrapper } = doMount();

      await wrapper.setProps({
        selectedPortIndex: 1,
        uniquePortKey: "key-that-changed",
      });

      expect(mockedAPI.port.getPortView).toBeCalledTimes(2);
      expect(mockedAPI.port.getPortView).toBeCalledWith(
        expect.objectContaining({
          portIdx: 1,
        }),
      );
    });

    it("should load port view when the selected view index changes", async () => {
      mockGetPortView();
      const { wrapper } = doMount();

      await wrapper.setProps({
        selectedViewIndex: 2,
        uniquePortKey: "key-that-changed",
      });

      expect(mockedAPI.port.getPortView).toBeCalledTimes(2);
      expect(mockedAPI.port.getPortView).toBeCalledWith(
        expect.objectContaining({
          viewIdx: 2,
        }),
      );
    });
  });

  describe("apiLayer", () => {
    const getApiLayer = (wrapper: VueWrapper<any>) => {
      const uiExtension = wrapper.findComponent(UIExtension);
      return uiExtension.props("apiLayer");
    };

    it("implements getResourceLocation in apiLayer", async () => {
      mockGetPortView();
      const { wrapper } = doMount();
      await flushPromises();

      const apiLayer = getApiLayer(wrapper);

      const location = await apiLayer.getResourceLocation("path1");

      expect(location).toBe("baseUrl/path1");
    });

    it("implements getResourceLocation in apiLayer (when rest api base url is defined)", async () => {
      mockedAPI.port.getPortView.mockResolvedValueOnce({
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

    it("implements callNodeDataService in apiLayer", async () => {
      mockGetPortView();
      mockedAPI.port.callPortDataService.mockResolvedValue({ something: true });
      const { wrapper } = doMount();
      await flushPromises();

      const apiLayer = getApiLayer(wrapper);

      const result = await apiLayer.callNodeDataService({
        projectId,
        workflowId,
        nodeId,
        serviceType: "data",
        dataServiceRequest: "request",
        extensionType: "data",
      });

      expect(result).toStrictEqual({ result: { something: true } });

      expect(mockedAPI.port.callPortDataService).toHaveBeenCalledWith({
        dataServiceRequest: "request",
        nodeId: "node1",
        portIdx: 0,
        projectId: "project-id",
        serviceType: "data",
        viewIdx: 0,
        workflowId: "workflow-id",
        versionId: CURRENT_STATE_VERSION,
      });
    });

    it("implements callNodeDataService in apiLayer if versionId is set as prop", async () => {
      mockGetPortView();
      const versionId = "version-id";
      const { wrapper } = doMount({ versionId });
      await flushPromises();

      const apiLayer = getApiLayer(wrapper);
      await apiLayer.callNodeDataService({
        projectId: "",
        workflowId: "",
        nodeId: "",
        serviceType: "data",
        dataServiceRequest: "request",
        extensionType: "data",
      });

      expect(mockedAPI.port.callPortDataService).toHaveBeenCalledWith({
        dataServiceRequest: "request",
        nodeId: "node1",
        portIdx: 0,
        projectId: "project-id",
        serviceType: "data",
        viewIdx: 0,
        workflowId: "workflow-id",
        versionId,
      });
    });

    it("implements registerPushEventService in apiLayer to listen to selection events", async () => {
      mockGetPortView();
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

    describe("opens data value view when openDataValueView is called", () => {
      const rowIndex = 0;
      const colIndex = 0;
      const anchor = {
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        width: 0,
        height: 0,
      };

      it("without version id as prop", async () => {
        vi.useFakeTimers();
        mockGetPortView();
        mockGetDataValueView();
        const { wrapper } = doMount();
        await flushPromises();

        const apiLayer = getApiLayer(wrapper);
        const dispatchPushEvent = vi.fn();
        apiLayer.registerPushEventService({
          dispatchPushEvent,
        });

        apiLayer.showDataValueView({
          rowIndex,
          colIndex,
          anchor,
        });

        await flushPromises();
        const dataValueViewWrapper =
          wrapper.findComponent(DataValueViewWrapper);
        expect(dataValueViewWrapper.exists()).toBe(true);
        const dataValueViewWrapperProps = dataValueViewWrapper.props();
        expect(dataValueViewWrapperProps).toStrictEqual(
          expect.objectContaining({
            projectId: "project-id",
            workflowId: "workflow-id",
            nodeId: "node1",
            selectedPortIndex: 0,
            selectedRowIndex: rowIndex,
            selectedColIndex: colIndex,
          }),
        );
        expect(dataValueViewWrapperProps.versionId).toBeUndefined();

        expect(dispatchPushEvent).toHaveBeenCalledWith({
          eventType: "DataValueViewShownEvent",
          payload: true,
        });

        apiLayer.showDataValueView({
          rowIndex: 1,
          colIndex: 2,
          anchor,
        });

        await flushPromises();
        expect(dataValueViewWrapperProps.selectedRowIndex).toBe(1);
        expect(dataValueViewWrapperProps.selectedColIndex).toBe(2);
        expect(dispatchPushEvent).toHaveBeenCalledTimes(1);

        apiLayer.closeDataValueView();
        vi.runAllTimers();
        // Does not close the wrapper, since close is ignored closely after open
        expect(wrapper.findComponent(DataValueViewWrapper).exists()).toBe(true);

        // Wait for the open to timeout
        vi.runAllTimers();
        apiLayer.closeDataValueView();
        vi.runAllTimers();
        await flushPromises();

        expect(wrapper.findComponent(DataValueViewWrapper).exists()).toBe(
          false,
        );
        expect(dispatchPushEvent).toHaveBeenNthCalledWith(2, {
          eventType: "DataValueViewShownEvent",
          payload: false,
        });
        vi.useRealTimers();
      });

      it("with versionId as prop", async () => {
        mockGetPortView();
        const versionId = "version-id";
        const { wrapper } = doMount({ versionId });
        await flushPromises();

        const apiLayer = getApiLayer(wrapper);
        const dispatchPushEvent = vi.fn();
        apiLayer.registerPushEventService({
          dispatchPushEvent,
        });

        apiLayer.showDataValueView({
          rowIndex,
          colIndex,
          anchor,
        });

        await flushPromises();
        const dataValueViewWrapper =
          wrapper.findComponent(DataValueViewWrapper);
        expect(dataValueViewWrapper.exists()).toBe(true);
        expect(dataValueViewWrapper.props().versionId).toBe(versionId);
      });
    });

    it("implements updateDataPointSelection", async () => {
      mockGetPortView();
      mockedAPI.port.updateDataPointSelection.mockResolvedValue({
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

      expect(mockedAPI.port.updateDataPointSelection).toHaveBeenCalledWith({
        nodeId: "node1",
        projectId: "project-id",
        workflowId: "workflow-id",
        versionId: CURRENT_STATE_VERSION,
        mode: "ADD",
        selection: ["Row1", "Row3"],
        portIdx: props.selectedPortIndex,
        viewIdx: props.selectedViewIndex,
      });
    });

    it("implements updateDataPointSelection if versionId prop is set", async () => {
      mockGetPortView();
      mockedAPI.port.updateDataPointSelection.mockResolvedValue({
        something: true,
      });
      const versionId = "version-id";
      const { wrapper } = doMount({ versionId });
      await flushPromises();
      const apiLayer = getApiLayer(wrapper);

      await apiLayer.updateDataPointSelection({
        nodeId: "",
        projectId: "",
        workflowId: "",
        mode: "ADD",
        selection: ["Row1", "Row3"],
      });

      expect(mockedAPI.port.updateDataPointSelection).toHaveBeenCalledWith({
        nodeId: "node1",
        projectId: "project-id",
        workflowId: "workflow-id",
        versionId,
        mode: "ADD",
        selection: ["Row1", "Row3"],
        portIdx: props.selectedPortIndex,
        viewIdx: props.selectedViewIndex,
      });
    });
  });

  describe("error", () => {
    it("should emit error state when receiving a alert from apiLayer", async () => {
      mockGetPortView();
      const { wrapper } = doMount();
      await flushPromises();

      const uiExtension = wrapper.findComponent(UIExtension);
      const props = uiExtension.props();

      // data errors from the BE would come in via the sendAlert apiLayer
      props.apiLayer.sendAlert({
        message: "mock error",
        type: "error",
      });

      const emittedEvents = wrapper.emitted("loadingStateChange");
      expect(emittedEvents![emittedEvents!.length - 1][0]).toEqual({
        value: "error",
        message: "mock error",
      });
    });

    it("should reset error state if uniquePortKey changes", async () => {
      mockGetPortView();
      const { wrapper } = doMount();
      await flushPromises();

      const uiExtension = wrapper.findComponent(UIExtension);
      const props = uiExtension.props();

      // data errors from the BE would come in via the sendAlert apiLayer
      props.apiLayer.sendAlert({
        type: "error",
        message: "mock error",
      });

      await wrapper.setProps({
        selectedViewIndex: 2,
        uniquePortKey: "key-that-changed",
      });

      const emittedEvents = wrapper.emitted("loadingStateChange");
      expect(emittedEvents![emittedEvents!.length - 1][0]).toEqual(
        expect.objectContaining({
          value: "loading",
          message: "Loading port view data",
        }),
      );
    });
  });
});
