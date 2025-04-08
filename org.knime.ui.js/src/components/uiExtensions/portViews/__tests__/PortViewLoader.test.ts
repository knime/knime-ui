import { afterEach, describe, expect, it, vi } from "vitest";
import { VueWrapper, flushPromises, mount } from "@vue/test-utils";
import { API } from "@api";

import { CURRENT_STATE_VERSION } from "@knime/hub-features/versions";
import { UIExtension } from "@knime/ui-extension-renderer/vue";

import { SelectionEvent } from "@/api/gateway-api/generated-api";
import { deepMocked } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";
import { setRestApiBaseUrl } from "../../common/useResourceLocation";
import { useSelectionEvents } from "../../common/useSelectionEvents";
import DataValueViewWrapper from "../../dataValueViews/DataValueViewWrapper.vue";
import PortViewLoader from "../PortViewLoader.vue";

const mockedAPI = deepMocked(API);

describe("PortViewLoader.vue", () => {
  const dummyNode = {
    id: "node1",
    selected: true,
    outPorts: [
      { portContentVersion: "dummy" },
      { portContentVersion: "dummy2" },
    ],
    isLoaded: false,
    state: {
      executionState: "UNSET",
    },
    allowedActions: {
      canExecute: false,
    },
  };

  const props = {
    projectId: "project-id",
    workflowId: "workflow-id",
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

  it("should load port view on mount", () => {
    mockGetPortView();
    doMount();

    expect(mockedAPI.port.getPortView).toBeCalledWith(
      expect.objectContaining({
        projectId: props.projectId,
        workflowId: props.workflowId,
        versionId: CURRENT_STATE_VERSION,
        nodeId: props.selectedNode.id,
        portIdx: props.selectedPortIndex,
      }),
    );
  });

  it("should conditionally deactivate data services on unmount", async () => {
    mockGetPortView();
    const { wrapper } = doMount();
    wrapper.unmount();
    await flushPromises();
    expect(mockedAPI.port.deactivatePortDataServices).toHaveBeenCalledTimes(0);

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
      viewIdx: 0,
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
        serviceType: "data",
        dataServiceRequest: "request",
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

    it("opens data value view when openDataValueView is called", async () => {
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

      apiLayer.showDataValueView({
        rowIndex,
        colIndex,
        anchor,
      });

      await flushPromises();
      const dataValueViewWrapper = wrapper.findComponent(DataValueViewWrapper);
      expect(dataValueViewWrapper.exists()).toBe(true);
      expect(dataValueViewWrapper.props()).toStrictEqual(
        expect.objectContaining({
          projectId: "project-id",
          workflowId: "workflow-id",
          nodeId: "node1",
          selectedPortIndex: 0,
          selectedRowIndex: rowIndex,
          selectedColIndex: colIndex,
        }),
      );

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
      expect(dataValueViewWrapper.props().selectedRowIndex).toBe(1);
      expect(dataValueViewWrapper.props().selectedColIndex).toBe(2);
      expect(dispatchPushEvent).toHaveBeenCalledTimes(1);

      apiLayer.closeDataValueView();
      await vi.runAllTimers();
      await flushPromises();
      // Does not close the wrapper, since close is ignored closely after open
      expect(wrapper.findComponent(DataValueViewWrapper).exists()).toBe(true);

      // Wait for the open to timeout
      await vi.runAllTimers();
      apiLayer.closeDataValueView();
      await vi.runAllTimers();
      await flushPromises();

      expect(wrapper.findComponent(DataValueViewWrapper).exists()).toBe(false);
      expect(dispatchPushEvent).toHaveBeenNthCalledWith(2, {
        eventType: "DataValueViewShownEvent",
        payload: false,
      });
      vi.useRealTimers();
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
