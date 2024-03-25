import { expect, describe, afterEach, it, vi } from "vitest";
import * as Vue from "vue";
import { flushPromises, mount } from "@vue/test-utils";

import { deepMocked, mockDynamicImport, mockVuexStore } from "@/test/utils";
import { UIExtension } from "webapps-common/ui/uiExtensions";
import { API } from "@api";

import * as applicationStore from "@/store/application";
import NodeViewLoader from "../NodeViewLoader.vue";
import { setRestApiBaseUrl } from "../../common/useResourceLocation";
import { useNodeConfigAPI } from "../../common/useNodeConfigAPI";
import {
  ApplyState,
  UIExtensionPushEvents,
  ViewState,
} from "@knime/ui-extension-service";
import ExecuteButton from "../../ExecuteButton.vue";

const dynamicImportMock = mockDynamicImport();

vi.mock("webapps-common/ui/uiExtensions/useDynamicImport", () => ({
  useDynamicImport: vi.fn().mockImplementation(() => {
    return { dynamicImport: dynamicImportMock };
  }),
}));

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
  const dummyNode = {
    id: "node1",
    selected: true,
    outPorts: [],
    isLoaded: false,
    state: {
      executionState: "UNSET",
    },
    allowedActions: {
      canExecute: false,
    },
    hasView: true,
  };

  const props = {
    projectId: "project-id",
    workflowId: "workflow-id",
    selectedNode: dummyNode,
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  const doMount = () => {
    const $store = mockVuexStore({
      application: applicationStore,
    });

    const wrapper = mount(NodeViewLoader, {
      props,
      global: { plugins: [$store] },
    });

    return { wrapper, $store };
  };

  it("should load nodeView on mount", () => {
    mockGetNodeView();
    doMount();

    expect(mockedAPI.node.getNodeView).toBeCalledWith(
      expect.objectContaining({
        projectId: props.projectId,
        workflowId: props.workflowId,
        nodeId: props.selectedNode.id,
      }),
    );
  });

  it("should load the node view when the selected node changes and the new node has a view", async () => {
    mockGetNodeView();
    const { wrapper } = doMount();
    const newNode = { ...dummyNode, id: "node2" };

    wrapper.setProps({ selectedNode: newNode });

    await Vue.nextTick();

    expect(mockedAPI.node.getNodeView).toBeCalledTimes(2);
    expect(mockedAPI.node.getNodeView).toBeCalledWith(
      expect.objectContaining({
        nodeId: "node2",
      }),
    );
  });

  it("should conditionally deactivate data services on unmount", async () => {
    mockGetNodeView();
    const { wrapper } = doMount();
    wrapper.unmount();
    await flushPromises();
    expect(mockedAPI.node.deactivateNodeDataServices).toHaveBeenCalledTimes(0);

    mockGetNodeView({
      deactivationRequired: true,
    });
    const { wrapper: wrapper2 } = doMount();
    await flushPromises();
    wrapper2.unmount();
    expect(mockedAPI.node.deactivateNodeDataServices).toHaveBeenCalledWith({
      projectId: props.projectId,
      workflowId: props.workflowId,
      nodeId: props.selectedNode.id,
      extensionType: "view",
    });
  });

  describe("apiLayer", () => {
    it("implements getResourceLocation in apiLayer", async () => {
      mockGetNodeView();
      const { wrapper } = doMount();
      await flushPromises();

      const uiExtension = wrapper.findComponent(UIExtension);
      const props = uiExtension.props();

      const apiLayer = props.apiLayer;

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
      const { wrapper, $store } = doMount();
      await flushPromises();
      $store.commit("application/setActiveProjectId", "project1");

      const uiExtension = wrapper.findComponent(UIExtension);
      const props = uiExtension.props();

      const apiLayer = props.apiLayer;

      const location = await apiLayer.getResourceLocation("path1");

      expect(location).toBe(
        "API_URL_BASE/jobs/project1/workflow/wizard/web-resources/path1",
      );
    });

    it("implements callNodeDataService in apiLayer", async () => {
      mockGetNodeView();
      mockedAPI.node.callNodeDataService.mockResolvedValue({ something: true });
      const { wrapper } = doMount();
      await flushPromises();

      const uiExtension = wrapper.findComponent(UIExtension);
      const props = uiExtension.props();

      const apiLayer = props.apiLayer;

      const result = await apiLayer.callNodeDataService({
        serviceType: "data",
        dataServiceRequest: "request",
      });

      expect(result).toStrictEqual({ result: { something: true } });

      expect(mockedAPI.node.callNodeDataService).toHaveBeenCalledWith({
        dataServiceRequest: "request",
        extensionType: "view",
        nodeId: "node1",
        projectId: "project-id",
        serviceType: "data",
        workflowId: "workflow-id",
      });
    });

    it("should emit an 'alert' event when a view has a notification", async () => {
      const { wrapper } = doMount();
      await flushPromises();

      const uiExtension = wrapper.findComponent(UIExtension);
      const apiLayer = uiExtension.props("apiLayer");

      const alert1 = {
        nodeId: "root:1",
        type: "warn",
        nodeInfo: { nodeName: "The Node" },
        message: "There's an warning in this node",
      };
      apiLayer.sendAlert(alert1);

      expect(wrapper.emitted("alert")![1][0]).toEqual(alert1);
    });
  });

  describe("nodeConfigAPI", () => {
    it("should update view data when receiving published data from a node config", async () => {
      mockGetNodeView();
      const { wrapper } = doMount();
      await flushPromises();

      const uiExtension = wrapper.findComponent(UIExtension);
      const apiLayer = uiExtension.props("apiLayer");

      const dispatchPushEvent = vi.fn();
      apiLayer.registerPushEventService({ dispatchPushEvent });

      const { setLatestPublishedData } = useNodeConfigAPI();

      setLatestPublishedData({ some: "new-data" });

      await Vue.nextTick();
      expect(dispatchPushEvent).toHaveBeenCalledWith({
        eventType: UIExtensionPushEvents.EventTypes.DataEvent,
        payload: { some: "new-data" },
      });
    });

    it("should render execute button if view should re-execute based on node config dirty state", async () => {
      mockGetNodeView();
      const { wrapper } = doMount();
      await flushPromises();

      const { setDirtyState } = useNodeConfigAPI();

      expect(wrapper.findComponent(ExecuteButton).exists()).toBe(false);
      expect(wrapper.findComponent(UIExtension).exists()).toBe(true);

      setDirtyState({ apply: ApplyState.CONFIG, view: ViewState.CONFIG });
      await Vue.nextTick();

      expect(wrapper.findComponent(ExecuteButton).exists()).toBe(true);
      expect(wrapper.findComponent(ExecuteButton).props("message")).toBe(
        "To preview the node, please apply your changes and re-execute the node",
      );
      expect(wrapper.findComponent(ExecuteButton).props("buttonLabel")).toBe(
        "Apply & execute",
      );
      expect(wrapper.findComponent(UIExtension).exists()).toBe(false);
    });
  });
});
